'use strict';
// Per-flag review gate: scripts/test-construction-bpo-routes.js's existing
// drafts carry zero flags (by design, so that file could test the basic
// draft/publish/scoping lifecycle in isolation), so none of its assertions
// would catch a regression here. This file drafts a report that DOES carry
// flags and exercises PATCH .../flags/:flagId plus the publish gate it
// backs: a report with any 'pending' flag cannot be published (409
// flags_pending); approving/dismissing every flag unblocks it; a client
// never sees a dismissed flag, a pending flag, or any analyst note, even
// on an approved one.
//
// Same in-process harness (fake Mongo + real server.js) as
// test-construction-bpo-routes.js.

const Module = require('module');

const collections = new Map();
const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
function matchValue(actual, cond) {
  if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
    if ('$in' in cond) return cond.$in.includes(actual);
    return JSON.stringify(actual) === JSON.stringify(cond);
  }
  return actual === cond;
}
function matches(doc, query) { return Object.keys(query || {}).every((k) => matchValue(doc[k], query[k])); }
function cmp(a, b) { return String(a ?? '') < String(b ?? '') ? -1 : String(a ?? '') > String(b ?? '') ? 1 : 0; }
function getCollection(name) {
  if (!collections.has(name)) {
    const docs = [];
    collections.set(name, {
      async findOne(query) { return clone(docs.find((d) => matches(d, query))) || null; },
      async updateOne(query, update, options = {}) {
        const i = docs.findIndex((d) => matches(d, query));
        if (i === -1) {
          if (!options.upsert) return { matchedCount: 0, modifiedCount: 0 };
          docs.push(clone(Object.assign({}, update.$set || {})));
          return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
        }
        docs[i] = Object.assign({}, docs[i], clone(update.$set || {}));
        return { matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
      },
      async insertOne(doc) { docs.push(clone(doc)); return { acknowledged: true }; },
      find(query) {
        let rows = docs.filter((d) => matches(d, query));
        const chain = {
          sort(spec) { const [k, dir] = Object.entries(spec || {})[0] || []; if (k) rows = rows.slice().sort((a, b) => cmp(a[k], b[k]) * dir); return chain; },
          limit(n) { rows = rows.slice(0, n); return chain; },
          async toArray() { return clone(rows); },
        };
        return chain;
      },
      _docs: docs,
    });
  }
  return collections.get(name);
}
class FakeMongoClient {
  async connect() { return this; }
  db() { return { collection: (name) => getCollection(name) }; }
  async close() {}
}
const mongodbPath = require.resolve('mongodb');
const fakeMongo = new Module(mongodbPath, null);
fakeMongo.exports = { MongoClient: FakeMongoClient };
fakeMongo.loaded = true;
require.cache[mongodbPath] = fakeMongo;
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://fake-host/tsm-consultz-test';

{
  const dotenvPath = require.resolve('dotenv');
  const fake = new Module(dotenvPath, null);
  fake.exports = { config: () => ({ parsed: {} }), parse: () => ({}) };
  fake.loaded = true;
  require.cache[dotenvPath] = fake;
}
process.env.TSM_SESSION_SECRET = 'test-session-secret-for-construction-bpo-flag-review';
process.env.TSM_ADMIN_PASSWORD = 'construction-bpo-flag-review-admin-pw';

const auth = require('../middleware/require-auth');

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed += 1; console.log('OK: ' + msg); }
  else { failed += 1; console.error('FAIL: ' + msg); }
}

let BASE = '';
function freePort() {
  return new Promise((resolve, reject) => {
    const srv = require('net').createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
  });
}
async function waitForServer() {
  let last;
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(BASE + '/health'); if (r.ok) return; } catch (e) { last = e; }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('server did not start: ' + (last && last.message));
}

const exp = () => Date.now() + 60 * 60 * 1000;
const cookie = (payload) => ({ Cookie: 'tsm_session=' + encodeURIComponent(auth.signSession(Object.assign({ exp: exp() }, payload))) });
const H = {
  admin: cookie({ role: 'admin' }),
  analyst: cookie({ role: 'analyst', label: 'Ann' }),
  client1: cookie({ role: 'client', clientId: 'flagclient-1' }),
};
const JSONH = (who) => Object.assign({ 'Content-Type': 'application/json' }, who ? H[who] : {});
const get = (p, who) => fetch(BASE + p, { headers: who ? H[who] : {} });
const post = (p, who, body) => fetch(BASE + p, { method: 'POST', headers: JSONH(who), body: JSON.stringify(body) });
const patch = (p, who, body) => fetch(BASE + p, { method: 'PATCH', headers: JSONH(who), body: JSON.stringify(body) });

async function main() {
  const port = await freePort();
  process.env.PORT = String(port);
  BASE = 'http://127.0.0.1:' + port;
  require('../server.js');
  await waitForServer();

  // A draft that trips OVERBILLED and LOW_MARGIN -- two real, independent flags.
  const draftInput = {
    clientId: 'flagclient-1', weekEnding: '2026-02-06',
    // percentComplete 50%, earnedRevenue 500,000, billedToDate 700,000 ->
    // overUnderBilling +200,000 = 20% of contractValue -> OVERBILLED.
    // margin = (1,000,000-960,000)/1,000,000 = 4% -> LOW_MARGIN. No
    // physicalPercentComplete/originalBudget supplied, so COST_OVERRUN
    // (either trigger) cannot also fire -- exactly 2 flags, deliberately.
    jobs: [{ jobId: 'J1', costsToDate: 480000, totalEstimatedCost: 960000, contractValue: 1000000, billedToDate: 700000 }],
  };
  let r = await post('/api/construction-bpo/weekly-reports', 'analyst', draftInput);
  let j = await r.json();
  ok(r.status === 200 && j.ok, 'draft a report with real flags');
  const reportId = j.report._id;
  const flags = j.report.flags;
  ok(flags.length === 2, 'draft carries 2 flags (OVERBILLED, LOW_MARGIN)');
  ok(flags.every((f) => f.status === 'pending' && typeof f.flagId === 'string' && f.note === null && f.reviewedBy === null && f.reviewedAt === null), 'every flag starts pending, with a flagId and no review fields set');
  const flagIds = flags.map((f) => f.flagId);
  ok(new Set(flagIds).size === flagIds.length, 'flagIds are unique within the draft');

  // ── publish refused while any flag is pending ──
  r = await post('/api/construction-bpo/weekly-reports/' + reportId + '/publish', 'analyst');
  j = await r.json();
  ok(r.status === 409 && j.error === 'flags_pending' && j.pendingCount === 2, 'publish is refused (409 flags_pending) while 2 flags are still pending');

  // ── PATCH auth/validation ──
  r = await patch('/api/construction-bpo/weekly-reports/' + reportId + '/flags/' + flagIds[0], null, { status: 'approved' });
  ok(r.status === 401, 'unauthenticated flag review is 401');

  r = await patch('/api/construction-bpo/weekly-reports/' + reportId + '/flags/' + flagIds[0], 'client1', { status: 'approved' });
  ok(r.status === 403, 'a client session cannot review flags (403)');

  r = await patch('/api/construction-bpo/weekly-reports/' + reportId + '/flags/' + flagIds[0], 'analyst', { status: 'not-a-real-status' });
  ok(r.status === 400, 'an invalid status value is 400');

  r = await patch('/api/construction-bpo/weekly-reports/' + reportId + '/flags/NOPE', 'analyst', { status: 'approved' });
  ok(r.status === 404, 'reviewing an unknown flagId is 404 flag_not_found');
  j = await r.json();
  ok(j.error === 'flag_not_found', 'unknown flagId error is specifically flag_not_found, not a generic not_found');

  // ── approve one, dismiss the other, with a note on the dismissal ──
  r = await patch('/api/construction-bpo/weekly-reports/' + reportId + '/flags/' + flagIds[0], 'analyst', { status: 'approved' });
  j = await r.json();
  ok(r.status === 200 && j.ok, 'analyst approves flag 1');
  let updatedFlag = j.report.flags.find((f) => f.flagId === flagIds[0]);
  ok(updatedFlag.status === 'approved' && updatedFlag.reviewedBy === 'Ann' && typeof updatedFlag.reviewedAt === 'string', 'approved flag carries reviewedBy/reviewedAt');
  // the per-job nested copy must ALSO reflect the update, not just the top-level flags array
  const nestedJobFlag = j.report.jobs[0].flags.find((f) => f.flagId === flagIds[0]);
  ok(nestedJobFlag && nestedJobFlag.status === 'approved', 'the nested jobs[].flags copy of the same flag is updated too, not just the top-level flags array');

  r = await patch('/api/construction-bpo/weekly-reports/' + reportId + '/flags/' + flagIds[1], 'analyst', { status: 'dismissed', note: 'Margin dip is a known bid-day rounding artifact, confirmed with PM.' });
  j = await r.json();
  ok(r.status === 200 && j.ok, 'analyst dismisses flag 2 with a note');
  const dismissedFlag = j.report.flags.find((f) => f.flagId === flagIds[1]);
  ok(dismissedFlag.status === 'dismissed' && dismissedFlag.note.includes('bid-day'), 'dismissed flag carries its note (staff view)');

  const auditEntries = await (await get('/api/construction-bpo/audit', 'admin')).json();
  ok(auditEntries.entries.filter((a) => a.eventType === 'FLAG_REVIEWED' && a.entityId === reportId).length === 2, 'both flag reviews wrote an audit entry');

  // ── publish now succeeds (no more pending flags) ──
  r = await post('/api/construction-bpo/weekly-reports/' + reportId + '/publish', 'analyst');
  j = await r.json();
  ok(r.status === 200 && j.ok && j.report.status === 'published', 'publish succeeds once every flag has been approved or dismissed');

  // ── flags are frozen once published ──
  r = await patch('/api/construction-bpo/weekly-reports/' + reportId + '/flags/' + flagIds[0], 'analyst', { status: 'dismissed' });
  j = await r.json();
  ok(r.status === 409 && j.error === 'already_published', 'reviewing a flag on an already-published report is 409, not a silent rewrite');

  // ── client view: sees the approved flag, never the dismissed one, never the note ──
  r = await get('/api/construction-bpo/weekly-reports/' + reportId, 'client1');
  j = await r.json();
  ok(r.status === 200 && j.report.status === 'published', 'the client can now see its own published report');
  ok(j.report.flags.length === 1 && j.report.flags[0].flagId === flagIds[0], 'client sees ONLY the approved flag, not the dismissed one');
  ok(!('note' in j.report.flags[0]), 'client-visible flag carries no `note` field at all, even though it was approved with none');
  const clientJobFlags = j.report.jobs[0].flags;
  ok(clientJobFlags.length === 1 && !('note' in clientJobFlags[0]), 'the nested jobs[].flags array is sanitized the same way for the client');

  const listRes = await (await get('/api/construction-bpo/weekly-reports', 'client1')).json();
  ok(listRes.reports.length === 1 && listRes.reports[0].flags.length === 1, 'the client list view is sanitized the same way as get-by-id');

  // ── a second draft where everything gets approved, to prove the gate opens fully ──
  const draftInput2 = {
    clientId: 'flagclient-1', weekEnding: '2026-02-13',
    changeOrders: [{ id: 'CO-X', jobId: 'J9', status: 'pending', submittedAt: '2026-01-01T00:00:00.000Z' }],
  };
  r = await post('/api/construction-bpo/weekly-reports', 'analyst', draftInput2);
  j = await r.json();
  const reportId2 = j.report._id;
  const soleFlagId = j.report.flags[0].flagId;
  await patch('/api/construction-bpo/weekly-reports/' + reportId2 + '/flags/' + soleFlagId, 'analyst', { status: 'dismissed' });
  r = await post('/api/construction-bpo/weekly-reports/' + reportId2 + '/publish', 'analyst');
  ok(r.status === 200, 'a report whose ONLY flag was dismissed (not approved) still publishes cleanly');
  r = await get('/api/construction-bpo/weekly-reports/' + reportId2, 'client1');
  j = await r.json();
  ok(j.report.flags.length === 0, 'client sees zero flags when the sole flag was dismissed rather than approved');

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
