#!/usr/bin/env node
'use strict';
// LIVE connected acceptance test for the BPO client-onboarding journey:
// admin creates a client + access code -> client logs in -> a case is
// created and a document uploaded to it -> client-rollup and
// client-monthly report are generated -> cross-client isolation is
// verified -> cleanup. Against a REAL MongoDB-compatible backend, not a
// mock. Distinct from scripts/test-bpo-mongo-live.js (that script proves
// chunking/encryption limits and recovery-outcome evidence across the
// whole BPO surface; this one is scoped to the single onboarding journey
// a new client actually goes through, as its own documented, repeatable
// check -- see docs/bpo-client-onboarding.md and `npm run bpo:onboarding-check`).
//
// Opt-in: requires BOTH MONGODB_URI AND BPO_MONGO_LIVE=1 (same opt-in
// variable as test-bpo-mongo-live.js -- this touches the same test
// database). Skips cleanly (exit 0) unless both are set.
//
// Refuses outright (exit 1) if NODE_ENV=production or FLY_APP_NAME is
// set. This check runs first and overrides the opt-in vars.
//
// SECURITY: never prints, logs, or writes MONGODB_URI or any substring.
// DATA: every record tagged "tsm-acceptance-<timestamp>-...". Snapshots
// and restores data/clients.json (bpoCreateClient's portal-login side
// effect) and deletes every Mongo record it created, in a `finally`
// block regardless of pass/fail.
//
// USAGE:
//   set -a; . ~/.tsm-mongo.env; set +a; BPO_MONGO_LIVE=1 node scripts/test-bpo-client-onboarding-live.js
//   npm run bpo:onboarding-check   (same thing, once the env is sourced)

if (process.env.NODE_ENV === 'production' || process.env.FLY_APP_NAME) {
  const reasons = [];
  if (process.env.NODE_ENV === 'production') reasons.push('NODE_ENV=production');
  if (process.env.FLY_APP_NAME) reasons.push('FLY_APP_NAME=' + process.env.FLY_APP_NAME);
  console.error('Refusing to run: this looks like a real deployment (' + reasons.join(', ') + ').');
  process.exit(1);
}

if (!process.env.MONGODB_URI || process.env.BPO_MONGO_LIVE !== '1') {
  console.log('MONGODB_URI and BPO_MONGO_LIVE=1 must both be set -- skipping BPO client-onboarding live acceptance test.');
  process.exit(0);
}

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');
function snapshotTrackedDataFiles() {
  try {
    const files = execSync('git ls-files data/', { cwd: REPO_ROOT, encoding: 'utf8' })
      .split('\n').map((f) => f.trim()).filter(Boolean);
    const snapshots = {};
    for (const relPath of files) {
      const abs = path.join(REPO_ROOT, relPath);
      try { snapshots[abs] = fs.readFileSync(abs); } catch (e) { /* tracked but missing on disk */ }
    }
    return snapshots;
  } catch (e) {
    console.warn('Could not snapshot tracked data/ files (git unavailable?):', e.message);
    return {};
  }
}
function restoreTrackedDataFiles(snapshots) {
  let restored = 0;
  for (const [abs, originalBuf] of Object.entries(snapshots)) {
    try {
      const current = fs.existsSync(abs) ? fs.readFileSync(abs) : null;
      if (!current || !current.equals(originalBuf)) {
        fs.writeFileSync(abs, originalBuf);
        restored++;
      }
    } catch (e) { console.warn('  could not restore', abs, ':', e.message); }
  }
  if (restored > 0) console.log('  restored', restored, 'tracked data/ file(s) this run touched');
  return restored;
}
const trackedDataFileSnapshots = snapshotTrackedDataFiles();

const TAG = 'tsm-acceptance-' + Date.now();
const PORT = Number(process.env.PORT || 8206);
process.env.PORT = String(PORT);
process.env.TSM_SESSION_SECRET = process.env.TSM_SESSION_SECRET || ('bpo-onboarding-accept-secret-' + Date.now());
process.env.TSM_ADMIN_PASSWORD = process.env.TSM_ADMIN_PASSWORD || ('bpo-onboarding-accept-admin-' + Date.now());
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
  return { cookie, data };
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

async function uploadFile(caseId, cookie, filename, buffer) {
  const form = new FormData();
  form.append('file', new Blob([buffer]), filename);
  const res = await fetch(BASE_URL + `/api/bpo/work-items/${caseId}/documents`, { method: 'POST', headers: { Cookie: cookie }, body: form });
  const data = await res.json();
  return { status: res.status, data };
}

const LEDGER_DB_NAME = 'tsm-consultz';
let mongoClient = null;
async function mongoDb() {
  if (mongoClient) return mongoClient.db(LEDGER_DB_NAME);
  const { MongoClient } = require('mongodb');
  mongoClient = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  await mongoClient.connect();
  return mongoClient.db(LEDGER_DB_NAME);
}

const createdClientIds = [];
const createdCaseIds = [];
const createdDocIds = [];

async function cleanup() {
  console.log('\n=== CLEANUP ===');
  const db = await mongoDb().catch(() => null);
  for (const docId of createdDocIds) {
    try {
      if (db) {
        await db.collection('bpo_documents_meta').deleteOne({ docId });
        await db.collection('bpo_document_chunks').deleteMany({ docId });
      }
    } catch (e) { console.warn('  cleanup warning (doc ' + docId + '):', e.message); }
  }
  for (const caseId of createdCaseIds) {
    try {
      if (db) {
        await db.collection('bpo_work_items').deleteMany({ caseId });
        await db.collection('bpo_sla_events').deleteMany({ caseId });
      }
    } catch (e) { console.warn('  cleanup warning (case ' + caseId + '):', e.message); }
  }
  for (const clientId of createdClientIds) {
    try {
      if (db) {
        await db.collection('bpo_clients').deleteMany({ id: clientId });
        await db.collection('bpo_client_monthly_reports').deleteMany({ clientId }).catch(() => {});
      }
    } catch (e) { console.warn('  cleanup warning (client ' + clientId + '):', e.message); }
  }
  try {
    if (db) {
      const res = await db.collection('bpo_audit_logs').deleteMany({ entityId: { $regex: '^' + TAG } });
      console.log('  removed', res.deletedCount, 'bpo_audit_logs entries tagged with this run');
    }
  } catch (e) { console.warn('  cleanup warning (audit logs):', e.message); }
  if (mongoClient) await mongoClient.close().catch(() => {});
  restoreTrackedDataFiles(trackedDataFileSnapshots);
  console.log('Cleanup complete.');
}

async function countBefore() {
  const db = await mongoDb();
  const [clients, cases, docs] = await Promise.all([
    db.collection('bpo_clients').countDocuments({}),
    db.collection('bpo_work_items').countDocuments({}),
    db.collection('bpo_documents_meta').countDocuments({}),
  ]);
  return { clients, cases, docs };
}

async function main() {
  console.log('Run tag:', TAG);
  console.log('Booting server on port', PORT, '...');
  require('../server');
  await waitForServer(15000);
  console.log('Server is up.\n');

  const before = await countBefore();
  console.log('Counts before:', JSON.stringify(before));

  const adminCookie = (await login({ password: process.env.TSM_ADMIN_PASSWORD })).cookie;

  // ════════════════════════════════════════════════════════════════════
  // 1) Admin creates the client -> gets an access code
  // ════════════════════════════════════════════════════════════════════
  console.log('=== 1) Admin creates client + access code ===');
  const clientRes = await api('POST', '/api/bpo/clients', adminCookie, { name: TAG + '-onboard-client', contactEmail: 'onboarding-test@example.com' });
  ok(clientRes.status === 200 && clientRes.data.ok, '1.1 admin creates client (status ' + clientRes.status + ')');
  const client = clientRes.data.client;
  createdClientIds.push(client.id);
  ok(!!client.accessCode && client.accessCode.length > 0, '1.2 client creation returns a usable access code');
  ok(client.hasLogin === true, '1.3 client creation reports hasLogin:true');

  // ════════════════════════════════════════════════════════════════════
  // 2) Client logs in with the access code
  // ════════════════════════════════════════════════════════════════════
  console.log('\n=== 2) Client logs in with the access code ===');
  const badLogin = await api('POST', '/api/auth/login', null, { accessCode: 'NOT-A-REAL-CODE' });
  ok(badLogin.status === 401, '2.1 a bogus access code is rejected -> 401 (got ' + badLogin.status + ')');

  const clientLogin = await login({ accessCode: client.accessCode });
  ok(clientLogin.data.role === 'client' && clientLogin.data.clientId === client.id, '2.2 client logs in, session carries role:client and the right clientId');
  const clientCookie = clientLogin.cookie;

  // Client cannot create its own case/upload -- today's architecture is
  // staff-mediated onboarding, confirmed rather than assumed.
  const clientTriesCreateCase = await api('POST', `/api/bpo/work-items/${TAG}-client-attempt`, clientCookie, { clientId: client.id });
  ok(clientTriesCreateCase.status === 403, '2.3 a client session cannot create a case itself -> 403 (confirms staff-mediated onboarding, got ' + clientTriesCreateCase.status + ')');

  // ════════════════════════════════════════════════════════════════════
  // 3) Staff creates a case for the client and uploads a document to it
  // ════════════════════════════════════════════════════════════════════
  console.log('\n=== 3) Staff creates a case and uploads a document ===');
  const caseId = TAG + '-onboard-case';
  const caseRes = await api('POST', `/api/bpo/work-items/${caseId}`, adminCookie, {
    clientId: client.id, payload: { structuredCase: { financialExposure: 3200, recoveryLikelihood: 'LIKELY' } },
  });
  ok(caseRes.status === 200 && caseRes.data.ok, '3.1 staff creates a case for the new client (status ' + caseRes.status + ')');
  createdCaseIds.push(caseId);

  const docBuf = Buffer.from('Sample onboarding document for ' + TAG, 'utf8');
  const uploaded = await uploadFile(caseId, adminCookie, 'onboarding-doc.txt', docBuf);
  ok(uploaded.status === 200 && uploaded.data.ok, '3.2 staff uploads a document to the case (status ' + uploaded.status + ')');
  if (uploaded.data && uploaded.data.ok) createdDocIds.push(uploaded.data.document.docId);

  const clientUploadAttempt = await uploadFile(caseId, clientCookie, 'client-attempt.txt', docBuf);
  ok(clientUploadAttempt.status === 403, '3.3 a client session cannot upload to a case itself -> 403 (got ' + clientUploadAttempt.status + ')');

  // ════════════════════════════════════════════════════════════════════
  // 4) client-rollup and client-monthly report
  // ════════════════════════════════════════════════════════════════════
  console.log('\n=== 4) client-rollup and client-monthly report ===');
  const rollup = await api('GET', '/api/bpo/reports/client-rollup', clientCookie);
  ok(rollup.status === 200 && rollup.data.ok, '4.1 client reads its own rollup (status ' + rollup.status + ')');
  const rollupCaseIds = (rollup.data.rollup.cases || []).map((c) => c.caseId);
  ok(rollupCaseIds.includes(caseId), '4.2 rollup includes the case created during onboarding');
  const rollupDocs = (rollup.data.rollup.cases || []).find((c) => c.caseId === caseId);
  ok(!rollupDocs || (!('payload' in rollupDocs) && !('owner' in rollupDocs)), '4.3 internal fields (payload, owner) stripped from the client-visible case');

  let genOutput = '';
  try {
    genOutput = execSync(`node scripts/generate-bpo-client-monthly-reports.js --client-id=${client.id}`, { encoding: 'utf8', timeout: 30000 });
  } catch (e) {
    genOutput = (e.stdout || '') + (e.stderr || '');
  }
  ok(/OK\s+/.test(genOutput) && genOutput.includes(client.id), '4.4 generate-bpo-client-monthly-reports.js runs, scoped to this client');

  const monthly = await api('GET', '/api/bpo/reports/client-monthly', clientCookie);
  ok(monthly.status === 200 && monthly.data.ok, '4.5 client reads its own persisted monthly report (status ' + monthly.status + ')');

  // ════════════════════════════════════════════════════════════════════
  // 5) Cross-client isolation: onboard a second client, confirm no leakage
  // ════════════════════════════════════════════════════════════════════
  console.log('\n=== 5) Cross-client isolation ===');
  const clientBRes = await api('POST', '/api/bpo/clients', adminCookie, { name: TAG + '-onboard-client-B' });
  ok(clientBRes.status === 200 && clientBRes.data.ok, '5.1 admin creates a second client (status ' + clientBRes.status + ')');
  const clientB = clientBRes.data.client;
  createdClientIds.push(clientB.id);

  const caseIdB = TAG + '-onboard-case-B';
  const caseResB = await api('POST', `/api/bpo/work-items/${caseIdB}`, adminCookie, { clientId: clientB.id, payload: { structuredCase: { financialExposure: 9999 } } });
  ok(caseResB.status === 200 && caseResB.data.ok, '5.2 staff creates a case for client B (status ' + caseResB.status + ')');
  createdCaseIds.push(caseIdB);

  const rollupAAfterB = await api('GET', '/api/bpo/reports/client-rollup', clientCookie);
  const rollupACaseIds = (rollupAAfterB.data.rollup.cases || []).map((c) => c.caseId);
  ok(!rollupACaseIds.includes(caseIdB), '5.3 client A\'s rollup never includes client B\'s case');

  const clientBLogin = await login({ accessCode: clientB.accessCode });
  const rollupB = await api('GET', '/api/bpo/reports/client-rollup', clientBLogin.cookie);
  const rollupBCaseIds = (rollupB.data.rollup.cases || []).map((c) => c.caseId);
  ok(rollupBCaseIds.includes(caseIdB) && !rollupBCaseIds.includes(caseId), '5.4 client B sees only its own case, never client A\'s');

  const crossTry = await api('GET', `/api/bpo/reports/client-rollup?clientId=${client.id}`, clientBLogin.cookie);
  const crossIds = (crossTry.data && crossTry.data.ok && crossTry.data.rollup.cases.map((c) => c.caseId)) || [];
  ok(!crossIds.includes(caseId), '5.5 client B cannot read client A\'s rollup by passing ?clientId= (session clientId wins)');

  const monthlyCrossTry = await api('GET', `/api/bpo/reports/client-monthly?clientId=${client.id}`, clientBLogin.cookie);
  ok(!(monthlyCrossTry.data && monthlyCrossTry.data.ok && monthlyCrossTry.data.report && monthlyCrossTry.data.report.clientId === client.id), '5.6 client B cannot read client A\'s monthly report by passing ?clientId=');

  const after = await countBefore();
  console.log('\nCounts after (before cleanup):', JSON.stringify(after));
}

main()
  .catch((err) => {
    fail++;
    console.error('\nScript error:', err.stack || err.message);
  })
  .finally(async () => {
    const beforeCleanup = await countBefore().catch(() => null);
    await cleanup();
    const afterCleanup = await countBefore().catch(() => null);
    if (beforeCleanup && afterCleanup) {
      console.log('Counts: before this run\'s cleanup', JSON.stringify(beforeCleanup), '-> after', JSON.stringify(afterCleanup));
    }
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(fail > 0 ? 1 : 0);
  });
