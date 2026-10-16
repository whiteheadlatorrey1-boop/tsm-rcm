'use strict';
// Regression test for the L1 Copilot analyze-batch background-job feature:
//   - server/l1-copilot/retry-delay.js (429 backoff: Retry-After header
//     takes priority over Groq's "try again in Xs" error-body text)
//   - server/l1-copilot/analyze-json-retry.js (truncated/malformed JSON
//     completion gets one retry with a bumped max_tokens budget)
//   - server/l1-copilot/analyze-job-store.js (file-backed job records,
//     modeled on audit-store.js)
//   - POST /api/l1-copilot/analyze/batch: synchronous for <=10 tickets,
//     background job (immediate 202 + jobId) above that
//   - GET /api/l1-copilot/analyze/batch/:jobId (progress/results)
//   - POST /api/l1-copilot/analyze/batch/:jobId/retry (re-runs failed AND
//     never-processed/null records -- see analyze-retry-selection.js --
//     but refuses with 409 while the job is still actively running/retrying,
//     since a second pass over those same in-flight null slots would
//     double-process them)
//   - startup recovery: a job still "running" when the process (re)starts
//     is orphaned, not actually in progress -- analyzeJobStore.markRunningJobsInterrupted()
//     reclassifies it as "interrupted" so it's visibly dead and its
//     unprocessed tail is retryable rather than stuck forever
//
// Runs fully offline: no SERVICENOW_* or GROQ_API_KEY needed. The route
// tests boot the real server in-process and sign a session cookie directly
// (same pattern as test-l1-servicenow-request-format.js) rather than going
// through the login endpoint. With no GROQ_API_KEY configured, every
// analyzeSingleTicket call fails fast and deterministically with "No Groq
// API key configured" -- no network calls, no timing flakiness -- which is
// exactly what's needed to assert on job mechanics (status transitions,
// per-record bookkeeping, retry re-targeting) independent of model output.

process.env.TSM_SESSION_SECRET = process.env.TSM_SESSION_SECRET || 'l1-analyze-jobs-test-secret';
process.env.PORT = '8103';
process.env.L1_COPILOT_DEMO_MODE = 'false';
delete process.env.SERVICENOW_INTEGRATION_ENABLED;
delete process.env.GROQ_API_KEY;
delete process.env.GROQ_KEY;

const fs = require('fs');
const http = require('http');

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('PASS:', msg); } else { fail++; console.log('FAIL:', msg); } };

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ───────────────────────── retry-delay.js ─────────────────────────────────

function testRetryDelay() {
  const { retryDelayMs, parseRetryAfterHeader, parseRetryAfterText } = require('../server/l1-copilot/retry-delay');

  ok(parseRetryAfterHeader('5') === 5, 'parseRetryAfterHeader reads a plain numeric header (got ' + parseRetryAfterHeader('5') + ')');
  ok(parseRetryAfterHeader(null) === null, 'parseRetryAfterHeader(null) is null');
  ok(parseRetryAfterHeader('not-a-number') === null, 'parseRetryAfterHeader ignores non-numeric header text');
  ok(parseRetryAfterHeader('-3') === null, 'parseRetryAfterHeader rejects a non-positive value');

  ok(parseRetryAfterText('Please try again in 14.257s') === 14.257, 'parseRetryAfterText extracts seconds from Groq-style error text');
  ok(parseRetryAfterText('no timing info here') === null, 'parseRetryAfterText returns null when no pattern matches');

  let d = retryDelayMs({ retryAfterHeader: '2', errMsg: 'Please try again in 999s' });
  ok(d === 2250, 'retryDelayMs prefers the Retry-After header over error-body text (got ' + d + ')');

  d = retryDelayMs({ retryAfterHeader: null, errMsg: 'Please try again in 1.5s' });
  ok(d === 2000, 'retryDelayMs falls back to error-body text when no header is present (got ' + d + ')');

  d = retryDelayMs({ retryAfterHeader: null, errMsg: null, fallbackMs: 3000 });
  ok(d === 3000, 'retryDelayMs falls back to fallbackMs when neither signal is present (got ' + d + ')');

  d = retryDelayMs({ retryAfterHeader: '500', errMsg: null, headerMaxMs: 60000 });
  ok(d === 60000, 'retryDelayMs caps a header-derived delay at headerMaxMs (got ' + d + ')');

  d = retryDelayMs({ retryAfterHeader: null, errMsg: 'Please try again in 500s', maxMs: 20000 });
  ok(d === 20000, 'retryDelayMs caps a text-derived delay at the (lower) maxMs (got ' + d + ')');
}

// ───────────────────────── analyze-json-retry.js ──────────────────────────

async function testAnalyzeJsonRetry() {
  const { parseWithRetry } = require('../server/l1-copilot/analyze-json-retry');
  const repairFn = (s) => s; // no-op repair for these tests -- isolates the retry-with-bigger-budget path

  // 1. Valid JSON on the first try -- callModel invoked exactly once, at the original budget.
  {
    const calls = [];
    const callModel = async (tokens) => { calls.push(tokens); return '{"ok":true}'; };
    const result = await parseWithRetry(callModel, 1000, repairFn, 800, 4000);
    ok(result.retried === false && result.value.ok === true, 'parseWithRetry returns parsed value on first try, retried=false');
    ok(calls.length === 1 && calls[0] === 1000, 'parseWithRetry calls the model exactly once at the original token budget on success (got ' + JSON.stringify(calls) + ')');
  }

  // 2. Malformed JSON first try, repair fixes it -- still only one model call.
  {
    const calls = [];
    const callModel = async (tokens) => { calls.push(tokens); return '{"confidence": eighty-five}'; };
    const fixer = (s) => s.replace('eighty-five', '85');
    const result = await parseWithRetry(callModel, 1000, fixer, 800, 4000);
    ok(result.retried === false && result.value.confidence === 85, 'parseWithRetry uses repairFn to fix malformed JSON without retrying the model');
    ok(calls.length === 1, 'repair path does not call the model a second time');
  }

  // 3. Malformed JSON first try, repair fails, retry with a bumped budget succeeds.
  {
    const calls = [];
    const callModel = async (tokens) => {
      calls.push(tokens);
      return calls.length === 1 ? '{"truncated": "mid-strin' : '{"truncated":"complete"}';
    };
    const result = await parseWithRetry(callModel, 1000, repairFn, 800, 4000);
    ok(result.retried === true && result.value.truncated === 'complete', 'parseWithRetry retries the model once after an unrecoverable parse failure');
    ok(calls.length === 2, 'exactly one retry call was made (got ' + calls.length + ' calls)');
    ok(calls[1] === 1800, 'the retry call used a higher token budget: 1000 + 800 bump = 1800 (got ' + calls[1] + ')');
    ok(result.retryMaxTokens === 1800, 'result reports the retryMaxTokens actually used (got ' + result.retryMaxTokens + ')');
  }

  // 4. The token bump is capped at the ceiling.
  {
    const calls = [];
    const callModel = async (tokens) => { calls.push(tokens); return '{"bad": json'; };
    try {
      await parseWithRetry(callModel, 3700, repairFn, 800, 4000);
      ok(false, 'expected parseWithRetry to throw when both attempts are malformed');
    } catch (e) {
      ok(calls[1] === 4000, 'retry token budget is capped at the ceiling: min(3700+800, 4000) = 4000 (got ' + calls[1] + ')');
      ok(/higher token budget \(4000\)/.test(e.message), 'thrown error names the retry budget that was tried (got: ' + e.message + ')');
      ok(e.retried === true && e.retryMaxTokens === 4000, 'thrown error carries retried/retryMaxTokens metadata');
    }
  }
}

// ───────────────────────── analyze-job-store.js ───────────────────────────

function testJobStore() {
  const jobStore = require('../server/l1-copilot/analyze-job-store');
  const file = jobStore.FILE_PATH;
  const backup = file + '.pretest-backup';
  const hadExisting = fs.existsSync(file);
  if (hadExisting) fs.renameSync(file, backup);

  try {
    const tickets = [
      { incident: 'INC1001', description: 'a' },
      { incident: 'INC1002', description: 'b' },
      { incident: 'INC1003', description: 'c' }
    ];

    const job = jobStore.createJob({ tickets, maxTokens: 1200, options: { chunkSize: 3, delayBetweenChunksMs: 250 } });
    ok(typeof job.id === 'string' && job.id.length > 0, 'createJob assigns a job id');
    ok(job.status === 'running' && job.total === 3 && job.succeeded === 0 && job.failed === 0, 'createJob initializes status/total/succeeded/failed');
    ok(Array.isArray(job.results) && job.results.length === 3 && job.results.every(r => r === null), 'createJob pre-sizes the results array with nulls');

    const fetched = jobStore.getJob(job.id);
    ok(fetched && fetched.id === job.id, 'getJob retrieves the job by id');
    ok(jobStore.getJob('no-such-job') === null, 'getJob returns null for an unknown id');

    jobStore.applyResults(job.id, [
      { index: 0, success: true, incident: 'INC1001', analysis: { severity: 'Low' }, cmdbSourced: false },
      { index: 2, success: false, incident: 'INC1003', error: 'boom' }
    ]);
    const afterChunk1 = jobStore.getJob(job.id);
    ok(afterChunk1.succeeded === 1 && afterChunk1.failed === 1, 'applyResults recomputes succeeded/failed from the full results array (got succeeded=' + afterChunk1.succeeded + ' failed=' + afterChunk1.failed + ')');
    ok(afterChunk1.results[1] === null, 'an index not yet processed stays null after a partial chunk update');

    jobStore.applyResults(job.id, [
      { index: 1, success: true, incident: 'INC1002', analysis: { severity: 'Medium' }, cmdbSourced: false }
    ]);
    const afterChunk2 = jobStore.getJob(job.id);
    ok(afterChunk2.succeeded === 2 && afterChunk2.failed === 1, 'applyResults accumulates correctly across multiple chunk updates');

    const completed = jobStore.completeJob(job.id);
    ok(completed.status === 'completed' && !!completed.completedAt, 'completeJob sets status=completed and a completedAt timestamp');

    const patched = jobStore.updateJob(job.id, { status: 'retrying' });
    ok(patched.status === 'retrying', 'updateJob merges an arbitrary patch into the stored job');
    ok(jobStore.updateJob('no-such-job', { status: 'x' }) === null, 'updateJob returns null for an unknown id');

    ok(fs.existsSync(file), 'job store persists to durable JSON at FILE_PATH');

    // --- markRunningJobsInterrupted: only jobs actually left "running" (a
    //     process died mid-job) get reclassified; everything else -- already
    //     completed, mid-retry, errored, or already interrupted -- is untouched. ---
    const runningJob1 = jobStore.createJob({ tickets: [{ incident: 'INCRUN1' }], maxTokens: null, options: null });
    const runningJob2 = jobStore.createJob({ tickets: [{ incident: 'INCRUN2' }], maxTokens: null, options: null });
    const completedJob = jobStore.createJob({ tickets: [{ incident: 'INCDONE' }], maxTokens: null, options: null });
    jobStore.completeJob(completedJob.id);
    const retryingJob = jobStore.createJob({ tickets: [{ incident: 'INCRETRYING' }], maxTokens: null, options: null });
    jobStore.updateJob(retryingJob.id, { status: 'retrying' });

    const markedIds = jobStore.markRunningJobsInterrupted();
    ok(markedIds.includes(runningJob1.id) && markedIds.includes(runningJob2.id), 'markRunningJobsInterrupted marks every job left in status=running');
    ok(!markedIds.includes(completedJob.id) && !markedIds.includes(retryingJob.id), 'markRunningJobsInterrupted leaves completed/retrying jobs alone');
    ok(jobStore.getJob(runningJob1.id).status === 'interrupted' && jobStore.getJob(runningJob2.id).status === 'interrupted', 'the marked jobs now read back as status=interrupted');
    ok(jobStore.getJob(completedJob.id).status === 'completed' && jobStore.getJob(retryingJob.id).status === 'retrying', 'untouched jobs keep their original status');

    const secondCall = jobStore.markRunningJobsInterrupted();
    ok(secondCall.length === 0, 'calling markRunningJobsInterrupted again is a no-op once nothing is left running (idempotent)');
  } finally {
    if (fs.existsSync(file)) fs.unlinkSync(file);
    if (hadExisting) fs.renameSync(backup, file);
  }
}

// ───────────────────────── analyze-retry-selection.js ─────────────────────

function testRetrySelection() {
  const { selectRetryEntries } = require('../server/l1-copilot/analyze-retry-selection');

  const tickets = [{ id: 't0' }, { id: 't1' }, { id: 't2' }, { id: 't3' }, { id: 't4' }];
  const results = [
    { success: true },   // 0: succeeded -- never retried
    null,                // 1: never processed (e.g. job interrupted mid-run)
    { success: false },  // 2: explicitly failed
    null,                // 3: never processed
    { success: true }    // 4: succeeded -- never retried
  ];

  const entries = selectRetryEntries(results, tickets);
  ok(entries.length === 3, 'selectRetryEntries picks exactly the failed + never-processed records (got ' + entries.length + ')');
  ok(entries.map(e => e.index).join(',') === '1,2,3', 'selectRetryEntries preserves original index order (got ' + entries.map(e => e.index).join(',') + ')');
  ok(entries.find(e => e.index === 1).ticket === tickets[1], 'a null (never-processed) record resolves to its original ticket');
  ok(entries.find(e => e.index === 3).ticket === tickets[3], 'the other null record also resolves to its original ticket');
  ok(entries.every(e => e.index !== 0 && e.index !== 4), 'succeeded records (0 and 4) are excluded');

  const allSucceeded = [{ success: true }, { success: true }];
  ok(selectRetryEntries(allSucceeded, tickets).length === 0, 'an all-succeeded results array yields no retry entries');

  ok(selectRetryEntries([], tickets).length === 0, 'an empty results array yields no retry entries');
  ok(selectRetryEntries(null, tickets).length === 0, 'a null/missing results array does not throw and yields no retry entries');

  const allNull = [null, null, null];
  const allNullEntries = selectRetryEntries(allNull, tickets);
  ok(allNullEntries.length === 3, 'an entirely-null results array (job never started processing) retries every record');
}

// ───────────────────────── route-level (real server) ──────────────────────

function request(port, method, path, cookie, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      host: '127.0.0.1', port, path, method,
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        cookie ? { Cookie: cookie } : {},
        payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}
      )
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = data ? JSON.parse(data) : null; } catch (e) { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function ticketsOf(count, prefix) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({ incident: `${prefix}${1000 + i}`, priority: '3 - Medium', description: `[test] sample ${i}` });
  }
  return out;
}

async function testRoutes() {
  const auth = require('../middleware/require-auth');
  const jobStore = require('../server/l1-copilot/analyze-job-store');

  // Seed a job left in status "running" BEFORE the server boots -- this
  // proves the startup recovery hook (analyzeJobStore.markRunningJobsInterrupted(),
  // called at module-load time in server.js) actually runs as a side effect
  // of requiring server.js, not just that the function works in isolation
  // (testJobStore() above already covers that in isolation).
  const preExistingRunningJob = jobStore.createJob({ tickets: [{ incident: 'INCPRESEED1' }], maxTokens: null, options: null });
  ok(preExistingRunningJob.status === 'running', 'sanity check: a freshly created job starts as status=running');

  require('../server');
  const port = Number(process.env.PORT);

  const seededAfterBoot = jobStore.getJob(preExistingRunningJob.id);
  ok(seededAfterBoot && seededAfterBoot.status === 'interrupted', 'a job left "running" before server startup is marked "interrupted" by the startup recovery hook (got ' + (seededAfterBoot && seededAfterBoot.status) + ')');

  const cookie = 'tsm_session=' + encodeURIComponent(auth.signSession({
    role: 'admin', staffId: 'TECH-ANALYZE-JOBS-TEST', label: 'Analyze Jobs Test', exp: Date.now() + 3600000
  }));

  // --- validation unchanged: still 400 above the hard max batch size ---
  let r = await request(port, 'POST', '/api/l1-copilot/analyze/batch', cookie, { tickets: ticketsOf(101, 'INCBIG') });
  ok(r.status === 400, 'a batch over the 100-ticket hard limit is still rejected at 400 (got ' + r.status + ')');

  // --- synchronous mode: <=10 tickets returns the full result immediately, no jobId ---
  r = await request(port, 'POST', '/api/l1-copilot/analyze/batch', cookie, { tickets: ticketsOf(5, 'INCSYNC') });
  ok(r.status === 200, 'a 5-ticket batch runs synchronously (200, got ' + r.status + ')');
  ok(r.body && r.body.ok === true && r.body.total === 5 && Array.isArray(r.body.results) && r.body.results.length === 5, 'synchronous response carries the full results array immediately');
  ok(r.body.jobId === undefined, 'synchronous response has no jobId');
  ok(r.body.failed === 5, 'with no GROQ_API_KEY configured, all 5 fail deterministically (got failed=' + r.body.failed + ')');

  // --- background mode: >10 tickets returns a jobId immediately (202), no results yet ---
  r = await request(port, 'POST', '/api/l1-copilot/analyze/batch', cookie, { tickets: ticketsOf(15, 'INCJOB') });
  ok(r.status === 202, 'a 15-ticket batch is accepted as a background job (202, got ' + r.status + ')');
  ok(r.body && typeof r.body.jobId === 'string', 'background-job response carries a jobId');
  ok(r.body.results === undefined, 'background-job creation response does not include a results array');
  const jobId = r.body.jobId;

  // --- GET on an unknown job id is a 404 ---
  r = await request(port, 'GET', '/api/l1-copilot/analyze/batch/no-such-job', cookie);
  ok(r.status === 404, 'GET on an unknown jobId returns 404 (got ' + r.status + ')');

  // --- retry is refused with 409 while the job is still actively running --
  //     calling retry on an in-progress job would start a second chunk loop
  //     racing the first over the same still-null (in-flight) indices. ---
  const stillRunning = await request(port, 'GET', '/api/l1-copilot/analyze/batch/' + jobId, cookie);
  ok(stillRunning.body && stillRunning.body.status === 'running', 'sanity check: the job is still status=running immediately after creation (got ' + (stillRunning.body && stillRunning.body.status) + ')');
  r = await request(port, 'POST', '/api/l1-copilot/analyze/batch/' + jobId + '/retry', cookie);
  ok(r.status === 409, 'retry on a job that is still status=running is refused with 409 (got ' + r.status + ')');
  ok(r.body && r.body.error === 'job is still in progress', 'the 409 body explains why (got: ' + (r.body && r.body.error) + ')');

  // --- retry is also refused with 409 while status=retrying (a retry pass
  //     already in flight) -- built directly against the store so it's
  //     deterministic rather than racing the background runner. ---
  const midRetryJob = jobStore.createJob({ tickets: [{ incident: 'INCMIDRETRY1' }], maxTokens: null, options: null });
  jobStore.updateJob(midRetryJob.id, { status: 'retrying' });
  r = await request(port, 'POST', '/api/l1-copilot/analyze/batch/' + midRetryJob.id + '/retry', cookie);
  ok(r.status === 409 && r.body.error === 'job is still in progress', 'retry on a job already mid-retry (status=retrying) is also refused with 409 (got ' + r.status + '/' + (r.body && r.body.error) + ')');

  // --- poll the real job until it completes (fast: no GROQ key means every
  //     record fails immediately, no network calls) ---
  let job = null;
  for (let i = 0; i < 40; i++) {
    r = await request(port, 'GET', '/api/l1-copilot/analyze/batch/' + jobId, cookie);
    job = r.body;
    if (job && (job.status === 'completed' || job.status === 'error')) break;
    await sleep(150);
  }
  ok(job && job.status === 'completed', 'background job reaches status=completed (got ' + (job && job.status) + ')');
  ok(job.total === 15 && job.succeeded + job.failed === 15, 'completed job accounts for all 15 tickets (total=' + (job && job.total) + ' succeeded=' + (job && job.succeeded) + ' failed=' + (job && job.failed) + ')');
  ok(Array.isArray(job.results) && job.results.every(x => x !== null), 'completed job has a fully populated results array');

  // --- retry-failed on a job that has failures re-runs just those records ---
  r = await request(port, 'POST', '/api/l1-copilot/analyze/batch/' + jobId + '/retry', cookie);
  ok(r.status === 202 && r.body.status === 'retrying', 'retry on a job with failures is accepted (202, status=retrying; got ' + r.status + '/' + (r.body && r.body.status) + ')');
  ok(r.body.retryCount === job.failed, 'retry reports the correct retryCount (got ' + r.body.retryCount + ', expected ' + job.failed + ')');

  let retried = null;
  for (let i = 0; i < 40; i++) {
    r = await request(port, 'GET', '/api/l1-copilot/analyze/batch/' + jobId, cookie);
    retried = r.body;
    if (retried && retried.status === 'completed') break;
    await sleep(150);
  }
  ok(retried && retried.status === 'completed', 'job returns to status=completed after retry finishes (got ' + (retried && retried.status) + ')');
  ok(retried.total === 15, 'retry does not change the job\'s total');

  // --- retry on a job with zero failures short-circuits without starting any work ---
  const cleanTickets = [{ incident: 'INCCLEAN1001' }, { incident: 'INCCLEAN1002' }];
  const cleanJob = jobStore.createJob({ tickets: cleanTickets, maxTokens: null, options: { chunkSize: 3, delayBetweenChunksMs: 250 } });
  jobStore.applyResults(cleanJob.id, [
    { index: 0, success: true, incident: 'INCCLEAN1001', analysis: {}, cmdbSourced: false },
    { index: 1, success: true, incident: 'INCCLEAN1002', analysis: {}, cmdbSourced: false }
  ]);
  jobStore.completeJob(cleanJob.id);

  r = await request(port, 'POST', '/api/l1-copilot/analyze/batch/' + cleanJob.id + '/retry', cookie);
  ok(r.status === 200 && r.body.message === 'no failed or unprocessed records to retry', 'retry on an all-succeeded job short-circuits with a 200 + explanatory message (got ' + r.status + '/' + (r.body && r.body.message) + ')');

  // --- retry also re-runs records that were never processed (null), not
  //     just ones that explicitly failed -- exactly what a server restart
  //     leaves behind mid-job. Build that scenario directly against the
  //     job store (bypassing the live background runner) so it's
  //     deterministic: 1 success, 1 explicit failure, 3 untouched nulls,
  //     and the job's status still "running" -- precisely what's on disk
  //     the instant a process dies mid-batch. ---
  const interruptedTickets = [
    { incident: 'INCINTR1001' }, { incident: 'INCINTR1002' }, { incident: 'INCINTR1003' },
    { incident: 'INCINTR1004' }, { incident: 'INCINTR1005' }
  ];
  const interruptedJob = jobStore.createJob({ tickets: interruptedTickets, maxTokens: null, options: { chunkSize: 3, delayBetweenChunksMs: 250 } });
  jobStore.applyResults(interruptedJob.id, [
    { index: 0, success: true, incident: 'INCINTR1001', analysis: {}, cmdbSourced: false },
    { index: 1, success: false, incident: 'INCINTR1002', error: 'boom' }
  ]);
  const midRun = jobStore.getJob(interruptedJob.id);
  ok(midRun.status === 'running' && midRun.results.filter(x => x === null).length === 3, 'simulated interrupted job has 1 success, 1 failure, and 3 never-processed (null) records, status still running');

  const markedNow = jobStore.markRunningJobsInterrupted();
  ok(markedNow.includes(interruptedJob.id), 'markRunningJobsInterrupted (called directly, as the next server startup would) flips the simulated job');
  ok(jobStore.getJob(interruptedJob.id).status === 'interrupted', 'simulated job now reads back as status=interrupted');

  r = await request(port, 'POST', '/api/l1-copilot/analyze/batch/' + interruptedJob.id + '/retry', cookie);
  ok(r.status === 202, 'retry on an interrupted job with null records is accepted (got ' + r.status + ')');
  ok(r.body.retryCount === 4, 'retryCount covers the 1 explicit failure PLUS the 3 never-processed (null) records = 4, not just the 1 failure (got ' + r.body.retryCount + ')');

  let recovered = null;
  for (let i = 0; i < 40; i++) {
    r = await request(port, 'GET', '/api/l1-copilot/analyze/batch/' + interruptedJob.id, cookie);
    recovered = r.body;
    if (recovered && recovered.status === 'completed') break;
    await sleep(150);
  }
  ok(recovered && recovered.status === 'completed', 'interrupted job returns to status=completed after retrying its failed + null records (got ' + (recovered && recovered.status) + ')');
  ok(recovered.results.every(x => x !== null), 'every previously-null record was actually reprocessed -- no nulls remain');
  ok(recovered.succeeded + recovered.failed === 5, 'all 5 original tickets are accounted for after recovery (got succeeded=' + (recovered && recovered.succeeded) + ' failed=' + (recovered && recovered.failed) + ')');
}

(async () => {
  testRetryDelay();
  await testAnalyzeJsonRetry();
  testJobStore();
  testRetrySelection();
  await testRoutes();

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('ERROR', e.stack || e.message);
  process.exit(1);
});
