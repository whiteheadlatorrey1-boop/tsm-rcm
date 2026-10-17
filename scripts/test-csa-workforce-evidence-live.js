#!/usr/bin/env node
'use strict';
// LIVE connected acceptance test for Part 1 of feat/workforce-evidence:
// staff-attested CSA evidence entries, the automatic training-completion
// ledger write, and the evidence-overview/dashboard "backed" status --
// against a REAL MongoDB-compatible backend, not a mock.
//
// Opt-in, not just "has credentials": requires BOTH MONGODB_URI AND
// BPO_MONGO_LIVE=1 (same opt-in variable as test-bpo-mongo-live.js --
// this script touches the same test database). Skips cleanly (exit 0)
// unless both are set.
//
// Refuses outright (exit 1) if this looks like a real deployment:
// NODE_ENV=production, or FLY_APP_NAME set. This check runs first and
// overrides the opt-in vars.
//
// SECURITY: never prints, logs, or writes MONGODB_URI or any substring.
// DATA: every candidate this script creates is tagged
// "tsm-acceptance-<timestamp>-...". Deletes everything it created --
// both the Mongo records and the filesystem CSA evidence ledger entries
// -- in a `finally` block, and only ever touches ledger files whose own
// candidateId matches one this run created.
//
// USAGE:
//   set -a; . ~/.tsm-mongo.env; set +a; BPO_MONGO_LIVE=1 node scripts/test-csa-workforce-evidence-live.js

if (process.env.NODE_ENV === 'production' || process.env.FLY_APP_NAME) {
  const reasons = [];
  if (process.env.NODE_ENV === 'production') reasons.push('NODE_ENV=production');
  if (process.env.FLY_APP_NAME) reasons.push('FLY_APP_NAME=' + process.env.FLY_APP_NAME);
  console.error('Refusing to run: this looks like a real deployment (' + reasons.join(', ') + ').');
  process.exit(1);
}

if (!process.env.MONGODB_URI || process.env.BPO_MONGO_LIVE !== '1') {
  console.log('MONGODB_URI and BPO_MONGO_LIVE=1 must both be set -- skipping Workforce CSA evidence live acceptance test.');
  process.exit(0);
}

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const TAG = 'tsm-acceptance-' + Date.now();
const PORT = Number(process.env.PORT || 8205);
process.env.PORT = String(PORT);
process.env.TSM_SESSION_SECRET = process.env.TSM_SESSION_SECRET || ('csa-workforce-accept-secret-' + Date.now());
process.env.TSM_ADMIN_PASSWORD = process.env.TSM_ADMIN_PASSWORD || ('csa-workforce-accept-admin-' + Date.now());
process.env.TSM_DOC_ENCRYPTION_KEY = process.env.TSM_DOC_ENCRYPTION_KEY || crypto.randomBytes(32).toString('base64');
process.env.SLACK_BPO_NOTIFY_ENABLED = '0';
delete process.env.SERVICENOW_INTEGRATION_ENABLED;

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('PASS:', msg); } else { fail++; console.log('FAIL:', msg); } };

const BASE_URL = 'http://127.0.0.1:' + PORT;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitForServer(maxMs) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE_URL + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      if (res.status) return;
    } catch (e) { /* not up yet */ }
    await sleep(150);
  }
  throw new Error('server did not come up within ' + maxMs + 'ms');
}

function extractCookie(res) {
  if (typeof res.headers.getSetCookie === 'function') {
    const all = res.headers.getSetCookie();
    if (all.length) return all[0].split(';')[0];
  }
  const single = res.headers.get('set-cookie');
  return single ? single.split(';')[0] : null;
}

async function login(body) {
  const res = await fetch(BASE_URL + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || !data.ok) throw new Error('login failed: ' + res.status + ' ' + JSON.stringify(data));
  const cookie = extractCookie(res);
  if (!cookie) throw new Error('login succeeded but no session cookie returned');
  return cookie;
}

async function api(method, p, cookie, body) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE_URL + p, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { /* non-JSON */ }
  return { status: res.status, data };
}

// tsm-ledger-service.js / candidate-registry-service.js both resolve to
// this hardcoded/default database name -- see docs/bpo-mongo-acceptance.md.
const DB_NAME = 'tsm-consultz';
let mongoClient = null;
async function mongoDb() {
  if (mongoClient) return mongoClient.db(DB_NAME);
  const { MongoClient } = require('mongodb');
  mongoClient = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  await mongoClient.connect();
  return mongoClient.db(DB_NAME);
}

const createdCandidateIds = [];

function cleanupLedgerFiles(candidateIds) {
  const { ledgerDir } = require('../server/certification/candidate-evidence-ledger');
  const dir = ledgerDir();
  if (!fs.existsSync(dir)) return 0;
  let removed = 0;
  for (const name of fs.readdirSync(dir)) {
    if (!/^[a-f0-9]{64}\.json$/.test(name)) continue;
    const full = path.join(dir, name);
    try {
      const row = JSON.parse(fs.readFileSync(full, 'utf8'));
      if (row && candidateIds.includes(row.candidateId)) {
        fs.unlinkSync(full);
        removed++;
      }
    } catch (e) { /* corrupt or unrelated file -- never touch it */ }
  }
  return removed;
}

async function cleanup() {
  console.log('\n=== CLEANUP ===');
  try {
    const db = await mongoDb();
    for (const candidateId of createdCandidateIds) {
      await db.collection('candidates').deleteMany({ candidateId });
      await db.collection('candidate_training_events').deleteMany({ candidateId });
    }
    console.log('  removed', createdCandidateIds.length, 'tagged candidate(s) from Mongo');
  } catch (e) {
    console.warn('  cleanup warning (Mongo):', e.message);
  }
  const removedFiles = cleanupLedgerFiles(createdCandidateIds);
  console.log('  removed', removedFiles, 'tagged CSA evidence ledger file(s)');
  if (mongoClient) await mongoClient.close().catch(() => {});
  console.log('Cleanup complete.');
}

async function main() {
  console.log('Run tag:', TAG);
  console.log('Booting server on port', PORT, '...');
  require('../server');
  await waitForServer(15000);
  console.log('Server is up.\n');

  const adminCookie = await login({ password: process.env.TSM_ADMIN_PASSWORD });

  // ════════════════════════════════════════════════════════════════════
  // 1(a) Staff-attested manual CSA evidence entry
  // ════════════════════════════════════════════════════════════════════
  console.log('=== 1(a) staff-attested manual CSA evidence ===');
  const candidateManualId = TAG + '-manual';
  {
    const created = await api('POST', '/api/candidates', adminCookie, {
      candidateId: candidateManualId, name: TAG + ' Manual Candidate', role: 'ServiceNow CSA', status: 'in_training', isSampleData: true,
    });
    ok(created.status === 201, '1a.1 create test-prefixed candidate (status ' + created.status + ')');
    createdCandidateIds.push(candidateManualId);

    // Give it a nonzero readiness score with NO auto-completion event, so
    // the only thing that can back it is the manual attestation below.
    const ev = await api('POST', `/api/candidates/${candidateManualId}/training-events`, null, { type: 'quiz', score: 70, weight: 1 });
    ok(ev.status === 201, '1a.2 record a plain training event (readiness score becomes nonzero)');

    const unauth = await api('POST', `/api/candidates/${candidateManualId}/csa-evidence`, null, { examId: TAG + '-EXAM-1', examDate: '2026-09-01', verifier: 'Live Test Verifier' });
    ok(unauth.status === 401, '1a.3 POST csa-evidence without a staff session -> 401 (got ' + unauth.status + ')');

    const recorded = await api('POST', `/api/candidates/${candidateManualId}/csa-evidence`, adminCookie, {
      examId: TAG + '-EXAM-1', examDate: '2026-09-01', verifier: 'Live Test Verifier', evidenceUrl: 'https://certs.example.com/' + TAG,
    });
    ok(recorded.status === 201, '1a.4 staff session records manual CSA evidence -> 201 (got ' + recorded.status + ')');
    ok(recorded.data && recorded.data.record && recorded.data.record.kind === 'manual_attestation', '1a.4 recorded record has kind manual_attestation');

    const dup = await api('POST', `/api/candidates/${candidateManualId}/csa-evidence`, adminCookie, {
      examId: TAG + '-EXAM-1', examDate: '2026-09-01', verifier: 'Live Test Verifier',
    });
    ok(dup.status === 409, '1a.5 duplicate examId for the same candidate is rejected -> 409 (got ' + dup.status + ')');
  }

  // ════════════════════════════════════════════════════════════════════
  // 1(b) Automatic ledger entry from a Career Training completion event
  // ════════════════════════════════════════════════════════════════════
  console.log('\n=== 1(b) automatic ledger entry on CSA completion event ===');
  const candidateAutoId = TAG + '-auto';
  const candidateUnbackedId = TAG + '-unbacked';
  {
    const created = await api('POST', '/api/candidates', adminCookie, {
      candidateId: candidateAutoId, name: TAG + ' Auto Candidate', role: 'ServiceNow CSA Analyst', status: 'in_training', isSampleData: true,
    });
    ok(created.status === 201, '1b.1 create second test-prefixed candidate, role variant "ServiceNow CSA Analyst" (status ' + created.status + ')');
    createdCandidateIds.push(candidateAutoId);

    const completion = await api('POST', `/api/candidates/${candidateAutoId}/training-events`, null, { type: 'csa_certification_complete', score: 95, weight: 1 });
    ok(completion.status === 201, '1b.2 record csa_certification_complete training event -> 201 (got ' + completion.status + ')');

    // Control candidate: nonzero score, no completion event, no manual
    // attestation -- proves the dashboard's "unbacked" state isn't just
    // always true/false regardless of real ledger content.
    const createdUnbacked = await api('POST', '/api/candidates', adminCookie, {
      candidateId: candidateUnbackedId, name: TAG + ' Unbacked Candidate', role: 'ServiceNow CSA', status: 'in_training', isSampleData: true,
    });
    ok(createdUnbacked.status === 201, '1b.3 create control candidate (status ' + createdUnbacked.status + ')');
    createdCandidateIds.push(candidateUnbackedId);
    const unbackedEv = await api('POST', `/api/candidates/${candidateUnbackedId}/training-events`, null, { type: 'quiz', score: 60, weight: 1 });
    ok(unbackedEv.status === 201, '1b.4 record a plain (non-completion) event for the control candidate');
  }

  // ════════════════════════════════════════════════════════════════════
  // 1(c)+(d) evidence-overview and the dashboard show "backed" once an
  // entry exists -- and still show "unbacked" for the control candidate
  // ════════════════════════════════════════════════════════════════════
  console.log('\n=== 1(c)/(d) evidence-overview reflects real ledger state ===');
  {
    const overview = await api('GET', '/api/candidates/evidence-overview', adminCookie);
    ok(overview.status === 200 && overview.data.ok, '1c.1 GET evidence-overview succeeds');
    const rows = overview.data.candidates || [];
    const manualRow = rows.find((r) => r.candidateId === candidateManualId);
    const autoRow = rows.find((r) => r.candidateId === candidateAutoId);
    const unbackedRow = rows.find((r) => r.candidateId === candidateUnbackedId);

    ok(!!manualRow && manualRow.csaEvidenceCount > 0 && manualRow.scoreUnbacked === false, '1c.2 manual-attestation candidate shows backed (csaEvidenceCount=' + (manualRow && manualRow.csaEvidenceCount) + ')');
    ok(!!autoRow && autoRow.csaEvidenceCount > 0 && autoRow.scoreUnbacked === false, '1c.3 auto-completion candidate shows backed (csaEvidenceCount=' + (autoRow && autoRow.csaEvidenceCount) + ')');
    ok(!!autoRow && autoRow.csaEvidence.some((e) => e.kind === 'training_completion'), '1c.3 auto-completion ledger entry has kind training_completion');
    ok(!!unbackedRow && unbackedRow.readinessScore > 0 && unbackedRow.scoreUnbacked === true, '1c.4 control candidate (no evidence) correctly still shows unbacked');

    console.log('  Driving html/workforce/certification-dashboard.html with Playwright...');
    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));
      const loginRes = await page.request.post(BASE_URL + '/api/auth/login', { data: { password: process.env.TSM_ADMIN_PASSWORD } });
      ok(loginRes.ok(), '1d.1 Playwright page session login succeeds');
      await page.goto(BASE_URL + '/html/workforce/certification-dashboard.html', { waitUntil: 'networkidle' });
      const bodyText = await page.locator('body').innerText();
      ok(bodyText.includes(TAG), '1d.2 dashboard shows our tagged candidates by name');
      ok(bodyText.includes('backed by ledger'), '1d.3 dashboard renders the "backed by ledger" badge for a backed candidate');
      ok(bodyText.includes('unbacked'), '1d.4 dashboard still renders "unbacked" for the control candidate');
      ok(pageErrors.length === 0, '1d.5 zero page errors (' + (pageErrors[0] || '') + ')');
    } finally {
      await browser.close();
    }
  }
}

main()
  .catch((err) => {
    fail++;
    console.error('\nScript error:', err.stack || err.message);
  })
  .finally(async () => {
    await cleanup();
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(fail > 0 ? 1 : 0);
  });
