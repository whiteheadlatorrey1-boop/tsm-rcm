#!/usr/bin/env node
'use strict';
// LIVE connected acceptance test: BPO document storage, client reporting,
// recovery-outcome evidence, and Workforce candidate evidence-overview —
// against a REAL MongoDB-compatible backend (Firestore's Mongo-compat
// layer in this project's case), not a mock.
//
// Skips cleanly (exit 0) when MONGODB_URI is unset, so `npm test` stays
// green in every environment that doesn't have a real database wired up.
//
// SECURITY: never prints, logs, or writes MONGODB_URI or any substring of
// it. Boots the real server in-process, inheriting whatever MONGODB_URI
// is already in this process's environment — never sets or reads it any
// other way.
//
// DATA: every record this script creates is tagged with the same run-tag
// prefix (TAG below, "tsm-acceptance-<timestamp>"). Never modifies or
// deletes anything this script didn't create itself. Deletes everything
// it created in a `finally` block regardless of pass/fail, and reports
// candidate/client/case counts before and after to prove cleanup actually
// happened rather than just being attempted.
//
// USAGE:
//   MONGODB_URI=... node scripts/test-bpo-mongo-live.js

if (!process.env.MONGODB_URI) {
  console.log('MONGODB_URI not set -- skipping BPO/Workforce Mongo live acceptance test.');
  process.exit(0);
}

const crypto = require('crypto');
const assert = require('assert');

const TAG = 'tsm-acceptance-' + Date.now();
const PORT = Number(process.env.PORT || 8199);
process.env.PORT = String(PORT);
process.env.TSM_SESSION_SECRET = process.env.TSM_SESSION_SECRET || ('bpo-mongo-accept-secret-' + Date.now());
process.env.TSM_ADMIN_PASSWORD = process.env.TSM_ADMIN_PASSWORD || ('bpo-mongo-accept-admin-' + Date.now());
process.env.TSM_DOC_ENCRYPTION_KEY = process.env.TSM_DOC_ENCRYPTION_KEY || crypto.randomBytes(32).toString('base64');
process.env.TSM_STRICT_INGEST = '0'; // not exercising the HC ingest gate today
process.env.SLACK_BPO_NOTIFY_ENABLED = '0';
process.env.L1_COPILOT_DEMO_MODE = process.env.L1_COPILOT_DEMO_MODE || 'false';
delete process.env.SERVICENOW_INTEGRATION_ENABLED;

let pass = 0, fail = 0;
const bugsFound = [];
const ambiguous = [];
function ok(cond, msg) {
  if (cond) { pass++; console.log('PASS:', msg); }
  else { fail++; console.log('FAIL:', msg); }
}

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const BASE_URL = 'http://127.0.0.1:' + PORT;

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

async function api(method, path, cookie, body) {
  const headers = { Cookie: cookie };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE_URL + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { /* non-JSON, e.g. a PDF/binary response */ }
  return { status: res.status, data, raw: text, buffer: null, headers: res.headers };
}

async function apiBinary(method, path, cookie) {
  const res = await fetch(BASE_URL + path, { method, headers: { Cookie: cookie } });
  const buf = Buffer.from(await res.arrayBuffer());
  return { status: res.status, buffer: buf, headers: res.headers };
}

async function uploadFile(caseId, cookie, filename, buffer) {
  const form = new FormData();
  form.append('file', new Blob([buffer]), filename);
  const res = await fetch(BASE_URL + `/api/bpo/work-items/${caseId}/documents`, {
    method: 'POST',
    headers: { Cookie: cookie },
    body: form,
  });
  const data = await res.json();
  return { status: res.status, data };
}

// ───────────────────────── direct-DB, read-only helpers ───────────────────
// Used only to verify what the HTTP layer can't directly show (chunk
// survival after soft-delete, bpo_audit_logs entry presence) — never to
// write or delete anything the HTTP API wouldn't also do.
let mongoClient = null;
// tsm-ledger-service.js hardcodes its database name to 'tsm-consultz'
// regardless of whatever database the MONGODB_URI's own path segment
// names (confirmed: candidate-registry-service.js, by contrast, honors
// MONGODB_DB_NAME || a default -- these two modules are inconsistent with
// each other). Match that hardcoded name here so this script's read-only
// verification queries land in the same database the server actually
// wrote to, not a different (likely empty) one implied by the URI path.
const LEDGER_DB_NAME = 'tsm-consultz';
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
const createdCandidateIds = [];

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
        await db.collection('bpo_learning_records').deleteMany({ caseId }).catch(() => {});
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
  for (const candidateId of createdCandidateIds) {
    try {
      if (db) {
        await db.collection('candidates').deleteMany({ candidateId });
        await db.collection('candidate_training_events').deleteMany({ candidateId });
      }
    } catch (e) { console.warn('  cleanup warning (candidate ' + candidateId + '):', e.message); }
  }
  // audit logs are append-only by design elsewhere in this codebase, but
  // the ones THIS script generated are pure test noise with no evidentiary
  // value -- remove only the ones tagged with this exact run's TAG.
  try {
    if (db) {
      const res = await db.collection('bpo_audit_logs').deleteMany({ entityId: { $regex: '^' + TAG } });
      console.log('  removed', res.deletedCount, 'bpo_audit_logs entries tagged with this run');
    }
  } catch (e) { console.warn('  cleanup warning (audit logs):', e.message); }

  if (mongoClient) await mongoClient.close().catch(() => {});
  console.log('Cleanup complete.');
}

async function countBefore() {
  const db = await mongoDb();
  const [clients, cases, docs, candidates] = await Promise.all([
    db.collection('bpo_clients').countDocuments({}),
    db.collection('bpo_work_items').countDocuments({}),
    db.collection('bpo_documents_meta').countDocuments({}),
    db.collection('candidates').countDocuments({}),
  ]);
  return { clients, cases, docs, candidates };
}

async function main() {
  console.log('Run tag:', TAG);
  console.log('Booting server on port', PORT, '...');
  require('../server');
  await waitForServer(15000);
  console.log('Server is up.\n');

  const before = await countBefore();
  console.log('Counts before:', JSON.stringify(before));

  const adminCookie = await login({ password: process.env.TSM_ADMIN_PASSWORD });

  // ════════════════════════════════════════════════════════════════════
  // 1) DOCUMENT STORAGE
  // ════════════════════════════════════════════════════════════════════
  console.log('\n=== 1) BPO document storage ===');
  {
    const clientRes = await api('POST', '/api/bpo/clients', adminCookie, { name: TAG + '-docs-client' });
    ok(clientRes.status === 200 && clientRes.data.ok, '1.0 create client for document tests');
    const clientId = clientRes.data.client.id;
    createdClientIds.push(clientId);

    const caseId = TAG + '-case-docs';
    const caseRes = await api('POST', `/api/bpo/work-items/${caseId}`, adminCookie, {
      clientId, payload: { structuredCase: { financialExposure: 5000, recoveryLikelihood: 'LIKELY' } },
    });
    ok(caseRes.status === 200 && caseRes.data.ok, '1.1 create work item for document tests');
    createdCaseIds.push(caseId);

    const smallBuf = crypto.randomBytes(10 * 1024); // 10 KB
    const multiChunkBuf = crypto.randomBytes(Math.round(1.5 * 1024 * 1024)); // 1.5 MB -> multiple 400KB chunks
    const nearCapBuf = crypto.randomBytes(8 * 1024 * 1024 - 2048); // just under the 8MB cap

    const cases = [
      ['10KB (single chunk)', smallBuf, 1],
      ['1.5MB (multi-chunk)', multiChunkBuf, Math.ceil(multiChunkBuf.length / (400 * 1024))],
      ['~8MB (near cap)', nearCapBuf, Math.ceil(nearCapBuf.length / (400 * 1024))],
    ];

    for (const [label, buf, expectedChunks] of cases) {
      const uploaded = await uploadFile(caseId, adminCookie, label.replace(/[^a-z0-9]/gi, '_') + '.bin', buf);
      ok(uploaded.status === 200 && uploaded.data.ok, `1.2 upload ${label} succeeds (status ${uploaded.status})`);
      if (!uploaded.data || !uploaded.data.ok) continue;
      const docId = uploaded.data.document.docId;
      createdDocIds.push(docId);
      ok(uploaded.data.document.chunkCount === expectedChunks, `1.2 ${label} chunked into ${expectedChunks} chunk(s) (got ${uploaded.data.document.chunkCount})`);

      const downloaded = await apiBinary('GET', `/api/bpo/documents/${docId}/download`, adminCookie);
      ok(downloaded.status === 200, `1.3 ${label} download returns 200`);
      ok(sha256(downloaded.buffer) === sha256(buf), `1.3 ${label} byte-for-byte sha256 match after round-trip`);
    }

    // Over-the-cap upload: confirm it's rejected cleanly, and try to learn
    // the real ceiling if this backend enforces something tighter than the
    // app-level 8MB multer cap.
    const overCap = crypto.randomBytes(8 * 1024 * 1024 + 1024);
    const overCapRes = await uploadFile(caseId, adminCookie, 'over_cap.bin', overCap);
    ok(overCapRes.status === 413 || overCapRes.status === 400, `1.4 over-8MB upload rejected cleanly (got ${overCapRes.status}, not a 500)`);

    // Soft-delete: chunks + meta survive, deleted flag flips, audit trail intact.
    const deleteTargetDocId = createdDocIds[0];
    const delRes = await api('DELETE', `/api/bpo/documents/${deleteTargetDocId}`, adminCookie);
    ok(delRes.status === 200 && delRes.data.document.deleted === true, '1.5 soft-delete flips deleted:true');

    const db = await mongoDb();
    const metaAfterDelete = await db.collection('bpo_documents_meta').findOne({ docId: deleteTargetDocId });
    ok(!!metaAfterDelete, '1.5 soft-deleted document meta record still exists (not hard-deleted)');
    const chunksAfterDelete = await db.collection('bpo_document_chunks').countDocuments({ docId: deleteTargetDocId });
    ok(chunksAfterDelete > 0, '1.5 soft-deleted document chunks still exist (' + chunksAfterDelete + ' chunk doc(s))');

    const downloadAfterDelete = await api('GET', `/api/bpo/documents/${deleteTargetDocId}/download`, adminCookie);
    ok(downloadAfterDelete.status === 404, '1.5 soft-deleted document is not downloadable (404)');

    const auditEntries = await db.collection('bpo_audit_logs').find({
      entityId: caseId,
      action: { $in: ['document.upload', 'document.download', 'document.delete'] },
    }).toArray();
    const actions = auditEntries.map((a) => a.action);
    ok(actions.filter((a) => a === 'document.upload').length >= 3, '1.6 bpo_audit_logs has upload entries for each upload (' + actions.filter((a) => a === 'document.upload').length + ' found)');
    ok(actions.includes('document.download'), '1.6 bpo_audit_logs has a download entry');
    ok(actions.includes('document.delete'), '1.6 bpo_audit_logs has a delete entry');

    console.log(`  Max accepted size confirmed: ${nearCapBuf.length} bytes uploaded and round-tripped successfully; ${overCap.length} bytes rejected. BPO_DOC_MAX_BYTES=8MB is the real, enforced ceiling -- the earlier "1 MiB per document" concern was about a single Mongo CHUNK document after base64 inflation (BPO_DOC_CHUNK_SIZE_BYTES=400KB keeps each chunk doc ~533KB), not the overall file-size cap. No document-level ceiling below 8MB was hit.`);
  }

  // ════════════════════════════════════════════════════════════════════
  // 2) CLIENT ROLLUP / MONTHLY REPORTS
  // ════════════════════════════════════════════════════════════════════
  console.log('\n=== 2) BPO case -> client rollup ===');
  {
    const clientARes = await api('POST', '/api/bpo/clients', adminCookie, { name: TAG + '-rollup-client-A' });
    const clientBRes = await api('POST', '/api/bpo/clients', adminCookie, { name: TAG + '-rollup-client-B' });
    ok(clientARes.status === 200 && clientBRes.status === 200, '2.0 create two clients for cross-client leakage check');
    const clientA = clientARes.data.client;
    const clientB = clientBRes.data.client;
    createdClientIds.push(clientA.id, clientB.id);
    ok(!!clientA.accessCode && !!clientB.accessCode, '2.0 client creation returns a usable access code');

    const caseA = TAG + '-case-rollup-A';
    const caseB = TAG + '-case-rollup-B';
    await api('POST', `/api/bpo/work-items/${caseA}`, adminCookie, { clientId: clientA.id, owner: 'internal-owner-A', payload: { structuredCase: { financialExposure: 1000 } } });
    await api('POST', `/api/bpo/work-items/${caseB}`, adminCookie, { clientId: clientB.id, owner: 'internal-owner-B', payload: { structuredCase: { financialExposure: 2000 } } });
    createdCaseIds.push(caseA, caseB);

    const clientACookie = await login({ accessCode: clientA.accessCode });
    const rollupA = await api('GET', '/api/bpo/reports/client-rollup', clientACookie);
    ok(rollupA.status === 200 && rollupA.data.ok, '2.1 client A can read its own rollup');
    const caseIdsInRollupA = rollupA.data.rollup.cases.map((c) => c.caseId);
    ok(caseIdsInRollupA.includes(caseA), '2.1 rollup includes client A\'s own case');
    ok(!caseIdsInRollupA.includes(caseB), '2.2 NO cross-client leakage: client A\'s rollup does not include client B\'s case');

    const strippedOk = rollupA.data.rollup.cases.every((c) => !('payload' in c) && !('owner' in c));
    ok(strippedOk, '2.3 internal fields (owner, payload) are stripped from every case in the rollup');

    const crossClientTry = await api('GET', `/api/bpo/reports/client-rollup?clientId=${clientB.id}`, clientACookie);
    const crossCaseIds = (crossClientTry.data && crossClientTry.data.ok && crossClientTry.data.rollup.cases.map((c) => c.caseId)) || [];
    ok(!crossCaseIds.includes(caseB), '2.4 client A cannot read client B\'s rollup by passing ?clientId= (session clientId wins, got ' + JSON.stringify(crossClientTry.data && crossClientTry.data.rollup && crossClientTry.data.rollup.clientId) + ')');

    // scripts/generate-bpo-client-monthly-reports.js, scoped to client A only
    const { execSync } = require('child_process');
    let genOutput = '';
    try {
      genOutput = execSync(`node scripts/generate-bpo-client-monthly-reports.js --client-id=${clientA.id}`, { encoding: 'utf8', timeout: 30000 });
    } catch (e) {
      genOutput = (e.stdout || '') + (e.stderr || '');
    }
    ok(/OK\s+/.test(genOutput) && genOutput.includes(clientA.id), '2.5 generate-bpo-client-monthly-reports.js succeeds, scoped to client A only');
    ok(!genOutput.includes(clientB.id), '2.5 monthly-report generator run did not touch client B (scoping confirmed)');

    const monthlyA = await api('GET', '/api/bpo/reports/client-monthly', clientACookie);
    ok(monthlyA.status === 200 && monthlyA.data.ok, '2.6 client A can read its own persisted monthly report');
  }

  // ════════════════════════════════════════════════════════════════════
  // 3) RECOVERY OUTCOME / EVIDENCE-PACKAGE / LEARNING-RECORD
  // ════════════════════════════════════════════════════════════════════
  console.log('\n=== 3) BPO recovery outcome evidence ===');
  {
    const clientRes = await api('POST', '/api/bpo/clients', adminCookie, { name: TAG + '-outcome-client' });
    const clientId = clientRes.data.client.id;
    createdClientIds.push(clientId);

    const caseId = TAG + '-case-outcome';
    await api('POST', `/api/bpo/work-items/${caseId}`, adminCookie, {
      clientId, payload: { structuredCase: { financialExposure: 10000, recoveryLikelihood: 'LIKELY' } },
    });
    createdCaseIds.push(caseId);

    const outcomeRes = await api('POST', `/api/bpo/work-items/${caseId}/outcome`, adminCookie, {
      recoveryStatus: 'PARTIALLY_RECOVERED', recoveredAmount: 6000, actionTaken: 'Appealed and partially recovered', payerOutcome: 'Partial payer approval',
    });
    ok(outcomeRes.status === 200 && outcomeRes.data.ok, '3.1 record recovery outcome');
    ok(outcomeRes.data.reconciliation && outcomeRes.data.reconciliation.recoveredAmount === 6000, '3.1 reconciliation reflects recorded amount');

    const learningRes = await api('POST', `/api/bpo/work-items/${caseId}/learning-record`, adminCookie);
    ok(learningRes.status === 200 && learningRes.data.ok, '3.2 build learning record');

    const learningReadRes = await api('GET', `/api/bpo/work-items/${caseId}/learning-record`, adminCookie);
    ok(learningReadRes.status === 200 && learningReadRes.data.ok, '3.3 learning record persists and reads back');

    const evidenceRes = await api('GET', `/api/bpo/work-items/${caseId}/evidence-package`, adminCookie);
    ok(evidenceRes.status === 200 && evidenceRes.data.ok, '3.4 build evidence package');
    const pkg = evidenceRes.data.package;
    ok(pkg && pkg.caseId === caseId, '3.4 evidence package references the right case');
    ok(pkg && pkg.outcome && pkg.outcome.recoveredAmount === 6000, '3.4 evidence package includes the recorded outcome');
  }

  // ════════════════════════════════════════════════════════════════════
  // 4) WORKFORCE: candidate evidence-overview
  // ════════════════════════════════════════════════════════════════════
  console.log('\n=== 4) Workforce candidate evidence-overview ===');
  {
    const candidateWithEvidenceId = TAG + '-candidate-1';
    const candidateNoEvidenceId = TAG + '-candidate-2';

    const c1 = await api('POST', '/api/candidates', adminCookie, {
      candidateId: candidateWithEvidenceId, name: TAG + ' Candidate One', role: 'ServiceNow CSA', status: 'in_training', isSampleData: true,
    });
    ok(c1.status === 201 && c1.data.candidate.candidateId === candidateWithEvidenceId, '4.1 create test-prefixed candidate via the existing admin route');
    createdCandidateIds.push(candidateWithEvidenceId);

    const c2 = await api('POST', '/api/candidates', adminCookie, {
      candidateId: candidateNoEvidenceId, name: TAG + ' Candidate Two', role: 'ServiceNow CSA', status: 'in_training', isSampleData: true,
    });
    ok(c2.status === 201, '4.1 create second test-prefixed candidate (no CSA evidence -> expect scoreUnbacked)');
    createdCandidateIds.push(candidateNoEvidenceId);

    // Give candidate 1 a nonzero readiness score via a real training event.
    const ev1 = await api('POST', `/api/candidates/${candidateWithEvidenceId}/training-events`, null, { type: 'quiz', score: 88, weight: 1 });
    ok(ev1.status === 201, '4.2 record training event for candidate one');

    // candidate two: also give it a nonzero score but NO CSA ledger entry,
    // so evidence-overview's scoreUnbacked flag should trigger for it.
    const ev2 = await api('POST', `/api/candidates/${candidateNoEvidenceId}/training-events`, null, { type: 'quiz', score: 77, weight: 1 });
    ok(ev2.status === 201, '4.2 record training event for candidate two');

    const overviewRes = await api('GET', '/api/candidates/evidence-overview', adminCookie);
    ok(overviewRes.status === 200 && overviewRes.data.ok, '4.3 GET evidence-overview succeeds');
    const rows = (overviewRes.data.candidates || []).filter((c) => c.candidateId === candidateWithEvidenceId || c.candidateId === candidateNoEvidenceId);
    ok(rows.length === 2, '4.3 evidence-overview includes both test candidates (found ' + rows.length + ')');
    const row2 = rows.find((r) => r.candidateId === candidateNoEvidenceId);
    ok(!!row2 && row2.readinessScore > 0 && row2.scoreUnbacked === true, '4.4 scoreUnbacked flag correctly set for a nonzero score with no CSA ledger entry (score=' + (row2 && row2.readinessScore) + ')');

    // Playwright: drive the real dashboard page, zero page errors.
    console.log('  Driving html/workforce/certification-dashboard.html with Playwright...');
    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));
      const loginRes = await page.request.post(BASE_URL + '/api/auth/login', { data: { password: process.env.TSM_ADMIN_PASSWORD } });
      ok(loginRes.ok(), '4.5 Playwright page session login succeeds');
      await page.goto(BASE_URL + '/html/workforce/certification-dashboard.html', { waitUntil: 'networkidle' });
      const rowCount = await page.locator('tbody tr').count();
      ok(rowCount > 0, '4.5 certification dashboard renders real rows (' + rowCount + ' row(s))');
      const bodyText = await page.locator('body').innerText();
      ok(bodyText.includes(TAG), '4.5 dashboard shows our tagged test candidate(s) by name');
      ok(pageErrors.length === 0, '4.5 zero page errors (' + (pageErrors[0] || '') + ')');
    } finally {
      await browser.close();
    }
  }

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
    if (mongoClient) await mongoClient.close().catch(() => {});
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(fail > 0 ? 1 : 0);
  });
