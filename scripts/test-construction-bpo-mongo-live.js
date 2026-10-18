#!/usr/bin/env node
'use strict';
// LIVE connected acceptance test: Construction BPO weekly-report
// drafting/publishing, the per-flag review gate, engagements, pilot
// metrics, and PDF export, against a REAL MongoDB-compatible backend,
// plus a Playwright e2e pass over the real workbench.html and
// client-portal.html pages -- not mocks, same convention as
// scripts/test-bpo-mongo-live.js.
//
// Opt-in, not just "has credentials": requires BOTH MONGODB_URI AND
// BPO_MONGO_LIVE=1 (the same opt-in variable test-bpo-mongo-live.js uses --
// this is one acceptance surface, not a second one to remember to set).
// Skips cleanly (exit 0) unless both are set.
//
// Refuses outright (exit 1) if NODE_ENV=production or FLY_APP_NAME is set,
// checked BEFORE the opt-in vars and overriding them -- this script creates
// a real BPO client, writes real construction_bpo_weekly_reports and
// construction_bpo_audit_logs documents, and publishes them; it must never
// run anywhere near the real deployment.
//
// SECURITY: never prints, logs, or writes MONGODB_URI or any substring.
//
// DATA: every record this run creates is tagged with TAG
// ("tsm-construction-bpo-accept-<timestamp>") and reported before/after;
// cleanup (in a `finally` block, runs regardless of pass/fail) removes
// the client, both weekly reports, and only the audit entries this run
// wrote.
//
// USAGE:
//   MONGODB_URI=... BPO_MONGO_LIVE=1 node scripts/test-construction-bpo-mongo-live.js

if (process.env.NODE_ENV === 'production' || process.env.FLY_APP_NAME) {
  const reasons = [];
  if (process.env.NODE_ENV === 'production') reasons.push('NODE_ENV=production');
  if (process.env.FLY_APP_NAME) reasons.push('FLY_APP_NAME=' + process.env.FLY_APP_NAME);
  console.error(
    'Refusing to run: this looks like a real deployment (' + reasons.join(', ') + ').\n' +
    'This script creates and deletes real records against whatever MONGODB_URI points at -- ' +
    'it must never run against production.'
  );
  process.exit(1);
}

if (!process.env.MONGODB_URI || process.env.BPO_MONGO_LIVE !== '1') {
  console.log('MONGODB_URI and BPO_MONGO_LIVE=1 must both be set -- skipping Construction BPO Mongo live acceptance test.');
  process.exit(0);
}

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');
function snapshotTrackedDataFiles() {
  try {
    const files = execSync('git ls-files data/', { cwd: REPO_ROOT, encoding: 'utf8' }).split('\n').map((f) => f.trim()).filter(Boolean);
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
      if (!current || !current.equals(originalBuf)) { fs.writeFileSync(abs, originalBuf); restored++; }
    } catch (e) { console.warn('  could not restore', abs, ':', e.message); }
  }
  if (restored > 0) console.log('  restored', restored, 'tracked data/ file(s) this run touched');
  return restored;
}
const trackedDataFileSnapshots = snapshotTrackedDataFiles();

const TAG = 'tsm-construction-bpo-accept-' + Date.now();
const PORT = Number(process.env.PORT || 8198);
process.env.PORT = String(PORT);
process.env.TSM_SESSION_SECRET = process.env.TSM_SESSION_SECRET || ('con-bpo-accept-secret-' + Date.now());
process.env.TSM_ADMIN_PASSWORD = process.env.TSM_ADMIN_PASSWORD || ('con-bpo-accept-admin-' + Date.now());
process.env.TSM_DOC_ENCRYPTION_KEY = process.env.TSM_DOC_ENCRYPTION_KEY || crypto.randomBytes(32).toString('base64');
process.env.SLACK_BPO_NOTIFY_ENABLED = '0';
delete process.env.SERVICENOW_INTEGRATION_ENABLED;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('PASS:', msg); } else { fail++; console.log('FAIL:', msg); } }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const BASE_URL = 'http://127.0.0.1:' + PORT;

async function waitForServer(maxMs) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try { const r = await fetch(BASE_URL + '/health'); if (r.ok) return; } catch (e) { /* not up yet */ }
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
  const headers = { Cookie: cookie };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE_URL + p, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { /* non-JSON */ }
  return { status: res.status, data, raw: text };
}

// ───────────────────────── direct-DB, read-only/cleanup helpers ──────────
let mongoClient = null;
// Safety guard: live acceptance may only run against a database named like a test DB.
if (process.env.MONGODB_URI && process.env.BPO_MONGO_LIVE === '1' && !/test/i.test(process.env.MONGODB_DB_NAME || '')) {
  console.error('REFUSING TO RUN: set MONGODB_DB_NAME to a test database (name must contain test), e.g. tsm_test. Got: ' + (process.env.MONGODB_DB_NAME || '(unset)'));
  process.exit(1);
}
const LEDGER_DB_NAME = process.env.MONGODB_DB_NAME || 'tsm-consultz'; // tsm-ledger-service.js honors MONGODB_DB_NAME
async function mongoDb() {
  if (mongoClient) return mongoClient.db(LEDGER_DB_NAME);
  const { MongoClient } = require('mongodb');
  mongoClient = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  await mongoClient.connect();
  return mongoClient.db(LEDGER_DB_NAME);
}

const createdClientIds = [];
const createdReportIds = [];
const createdEngagementClientIds = [];
const createdControllerTimeIds = [];

async function cleanup() {
  console.log('\n=== CLEANUP ===');
  const db = await mongoDb().catch(() => null);
  if (db) {
    for (const reportId of createdReportIds) {
      try { await db.collection('construction_bpo_weekly_reports').deleteOne({ _id: reportId }); }
      catch (e) { console.warn('  cleanup warning (report ' + reportId + '):', e.message); }
    }
    for (const clientId of createdClientIds) {
      try { await db.collection('bpo_clients').deleteMany({ id: clientId }); }
      catch (e) { console.warn('  cleanup warning (client ' + clientId + '):', e.message); }
    }
    for (const clientId of createdEngagementClientIds) {
      try { await db.collection('construction_bpo_engagements').deleteOne({ _id: clientId }); }
      catch (e) { console.warn('  cleanup warning (engagement ' + clientId + '):', e.message); }
    }
    for (const controllerTimeId of createdControllerTimeIds) {
      try { await db.collection('construction_bpo_controller_time').deleteOne({ _id: controllerTimeId }); }
      catch (e) { console.warn('  cleanup warning (controller-time ' + controllerTimeId + '):', e.message); }
    }
    try {
      const res = await db.collection('construction_bpo_audit_logs').deleteMany({ entityId: { $regex: '^' + createdReportIds.map((r) => r.split('__')[0])[0] || TAG } });
      console.log('  removed', res.deletedCount, 'construction_bpo_audit_logs entries tagged with this run');
    } catch (e) { console.warn('  cleanup warning (audit logs):', e.message); }
  }
  // Deliberately does NOT close mongoClient here -- main()'s finally block
  // still needs it for the afterCleanup verification read. Closing it
  // early made that read silently fail (mongoDb() happily returns a
  // closed client's db(), so the read throws and the catch(() => null)
  // swallowed it) and the "before -> after" confirmation line never
  // printed, even though the actual deletions above had already
  // succeeded -- confirmed separately against the real database. Closed
  // once, at the very end, by main()'s finally block.
  console.log('Cleanup complete.');
}

async function countBefore() {
  const db = await mongoDb();
  const [reports, audit, clients, engagements, controllerTime] = await Promise.all([
    db.collection('construction_bpo_weekly_reports').countDocuments({}),
    db.collection('construction_bpo_audit_logs').countDocuments({}),
    db.collection('bpo_clients').countDocuments({}),
    db.collection('construction_bpo_engagements').countDocuments({}),
    db.collection('construction_bpo_controller_time').countDocuments({}),
  ]);
  return { reports, audit, clients, engagements, controllerTime };
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

  // ── 1) real BPO client, via the existing (already-tested) client registry ──
  const clientRes = await api('POST', '/api/bpo/clients', adminCookie, { name: TAG + '-gc-client' });
  ok(clientRes.status === 200 && clientRes.data.ok, '1.1 create a real BPO client');
  const client = clientRes.data.client;
  const clientId = client.id;
  createdClientIds.push(clientId);
  ok(!!client.accessCode, '1.2 client creation returns a usable access code');

  // ── 2) week 1: draft, verify in real Mongo, publish ──
  const { buildWeekInput } = require('../server/construction-bpo/fixtures/sample-gc');
  const week1 = Object.assign({}, buildWeekInput(0), { clientId });

  let r = await api('POST', '/api/construction-bpo/weekly-reports', adminCookie, week1);
  ok(r.status === 200 && r.data.ok && r.data.report.status === 'draft', '2.1 draft week 1 via the real route');
  const reportId1 = r.data.report._id;
  createdReportIds.push(reportId1);
  ok(reportId1 === clientId + '__' + week1.weekEnding, '2.2 report id is clientId__weekEnding');

  const db = await mongoDb();
  const storedDraft = await db.collection('construction_bpo_weekly_reports').findOne({ _id: reportId1 });
  ok(!!storedDraft && storedDraft.status === 'draft', '2.3 draft actually persisted in real Mongo (construction_bpo_weekly_reports)');
  ok(Array.isArray(storedDraft.flags) && storedDraft.flags.some((f) => f.type === 'OVERBILLED'), '2.4 week-1 flags persisted (OVERBILLED present, matching the fixture)');

  const auditAfterDraft = await db.collection('construction_bpo_audit_logs').findOne({ entityId: reportId1, eventType: 'WEEKLY_REPORT_DRAFTED' });
  ok(!!auditAfterDraft, '2.5 drafting wrote a real audit-log document in Mongo');

  // Per-flag review gate (PR #256 review item 1): publish must be refused
  // against the REAL store while any flag is still pending, same as the
  // offline route test -- then each flag is approved for real via the
  // PATCH route before publish is retried.
  r = await api('POST', '/api/construction-bpo/weekly-reports/' + encodeURIComponent(reportId1) + '/publish', adminCookie);
  ok(r.status === 409 && r.data.error === 'flags_pending', '2.6 publish is refused (409 flags_pending) against the real store while week 1\'s flags are still pending');

  for (const f of storedDraft.flags) {
    const patchRes = await api('PATCH', '/api/construction-bpo/weekly-reports/' + encodeURIComponent(reportId1) + '/flags/' + encodeURIComponent(f.flagId), adminCookie, { status: 'approved' });
    if (patchRes.status !== 200) { ok(false, '2.7 approving flag ' + f.flagId + ' failed: ' + patchRes.status + ' ' + JSON.stringify(patchRes.data)); }
  }
  const afterReview = await db.collection('construction_bpo_weekly_reports').findOne({ _id: reportId1 });
  ok(afterReview.flags.every((f) => f.status === 'approved' && f.reviewedBy === 'admin'), '2.7 every flag is approved in real Mongo, with reviewedBy recorded');

  r = await api('POST', '/api/construction-bpo/weekly-reports/' + encodeURIComponent(reportId1) + '/publish', adminCookie);
  ok(r.status === 200 && r.data.report.status === 'published', '2.8 publish week 1 now that every flag has been reviewed');

  r = await api('POST', '/api/construction-bpo/weekly-reports/' + encodeURIComponent(reportId1) + '/publish', adminCookie);
  ok(r.status === 409 && r.data.error === 'already_published', '2.9 republishing an already-published report is 409 against the real store, not a silent no-op');

  // ── 3) week 2: draft stays a draft, so client scoping can be proven below ──
  const week2 = Object.assign({}, buildWeekInput(1), { clientId });
  r = await api('POST', '/api/construction-bpo/weekly-reports', adminCookie, week2);
  ok(r.status === 200 && r.data.ok, '3.1 draft week 2 (both COST_OVERRUN triggers + 3 stalled COs)');
  const reportId2 = r.data.report._id;
  createdReportIds.push(reportId2);
  const costOverrunReasons = r.data.report.flags.filter((f) => f.type === 'COST_OVERRUN').map((f) => f.reason).sort();
  ok(JSON.stringify(costOverrunReasons) === JSON.stringify(['cost_vs_physical_progress', 'eac_exceeds_original_budget']), '3.2 week 2 carries both COST_OVERRUN triggers');
  ok(r.data.report.summary.stalledChangeOrders === 3, '3.3 week 2 shows all 3 stalled change orders');

  // ── 4) client session: real accessCode login, client scoping against real Mongo ──
  const clientCookie = await login({ accessCode: client.accessCode });
  r = await api('GET', '/api/construction-bpo/weekly-reports', clientCookie);
  ok(r.status === 200 && r.data.reports.length === 1 && r.data.reports[0]._id === reportId1, '4.1 client sees exactly its own published week (not the still-draft week 2)');

  r = await api('GET', '/api/construction-bpo/weekly-reports/' + encodeURIComponent(reportId2), clientCookie);
  ok(r.status === 404, '4.2 client cannot see its own still-draft week 2 (404, not 403)');

  // ── 4b) engagements (review item 2) + pilot metrics (review item 3), against real Mongo ──
  r = await api('POST', '/api/construction-bpo/engagements', adminCookie, { clientId, name: TAG + '-engagement', coSlaHours: 48, thresholds: { wip: { lowMarginPct: 0.5 } } });
  ok(r.status === 200 && r.data.ok, '4b.1 create a real engagement for this client');
  const storedEngagement = await db.collection('construction_bpo_engagements').findOne({ _id: clientId });
  ok(!!storedEngagement && storedEngagement.coSlaHours === 48, '4b.2 engagement actually persisted in real Mongo');

  r = await api('GET', '/api/construction-bpo/engagements/' + encodeURIComponent(clientId) + '/metrics', adminCookie);
  ok(r.status === 200 && r.data.metrics.weeksDelivered === 1, '4b.3 pilot metrics reflect the one real published week (week 2 is still a draft)');
  ok(r.data.metrics.flags.approved >= storedDraft.flags.length, '4b.4 metrics flag counts reflect the real approved flags from week 1');

  r = await api('POST', '/api/construction-bpo/engagements/' + encodeURIComponent(clientId) + '/controller-time', adminCookie, { week: week1.weekEnding, minutes: 50 });
  ok(r.status === 200 && r.data.entry.minutes === 50, '4b.5 log real controller time against this engagement');
  const storedControllerTime = await db.collection('construction_bpo_controller_time').findOne({ _id: clientId + '__' + week1.weekEnding });
  ok(!!storedControllerTime, '4b.6 controller-time entry actually persisted in real Mongo');

  // ── 4c) PDF export (review item 6), against real Mongo ──
  const pdfRes = await fetch(BASE_URL + '/api/construction-bpo/weekly-reports/' + encodeURIComponent(reportId1) + '/export.pdf', { headers: { Cookie: adminCookie } });
  ok(pdfRes.status === 200 && pdfRes.headers.get('content-type') === 'application/pdf', '4c.1 PDF export of the real published report succeeds');
  const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
  ok(pdfBuf.slice(0, 5).toString('latin1') === '%PDF-', '4c.2 real PDF export is a genuine PDF (magic bytes)');

  // ── cleanup for the two extra collections this run touched ──
  createdEngagementClientIds.push(clientId);
  createdControllerTimeIds.push(clientId + '__' + week1.weekEnding);

  // ── 5) Playwright e2e: the real pages, against this same live server ──
  console.log('\n  Driving html/construction-bpo/workbench.html and client-portal.html with Playwright...');
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    const loginRes = await page.request.post(BASE_URL + '/api/auth/login', { data: { password: process.env.TSM_ADMIN_PASSWORD } });
    ok(loginRes.ok(), '5.1 Playwright staff session login succeeds');

    await page.goto(BASE_URL + '/html/construction-bpo/workbench.html', { waitUntil: 'networkidle' });
    await page.fill('#clientId', clientId);
    await page.click('#refreshReportsBtn');
    await page.waitForTimeout(400);
    const reportRows = await page.locator('#reportsTable tbody tr').count();
    ok(reportRows === 2, '5.2 workbench, pointed at the real client, lists both real reports (got ' + reportRows + ')');
    await page.click('#reportsTable tbody tr >> nth=0 >> button[data-view]');
    await page.waitForSelector('#reportPanel .cards');
    const panelText = await page.locator('#reportPanel').innerText();
    ok(panelText.length > 0, '5.3 workbench renders a real report pulled live from Mongo');

    await page.click('#refreshAuditBtn');
    await page.waitForTimeout(300);
    const auditRows = await page.locator('#auditTable tbody tr').count();
    ok(auditRows >= 3, '5.4 workbench audit trail shows real entries from Mongo (got ' + auditRows + ')');
    ok(pageErrors.length === 0, '5.5 workbench: zero page errors (' + (pageErrors[0] || '') + ')');

    const clientCtx = await browser.newContext();
    const clientPage = await clientCtx.newPage();
    const clientPageErrors = [];
    clientPage.on('pageerror', (e) => clientPageErrors.push(e.message));
    const clientLoginRes = await clientPage.request.post(BASE_URL + '/api/auth/login', { data: { accessCode: client.accessCode } });
    ok(clientLoginRes.ok(), '5.6 Playwright client session login succeeds');
    await clientPage.goto(BASE_URL + '/html/construction-bpo/client-portal.html', { waitUntil: 'networkidle' });
    const portalRows = await clientPage.locator('#reportsTable tbody tr').count();
    ok(portalRows === 1, '5.7 client portal shows exactly the one published report live from Mongo (got ' + portalRows + ')');
    await clientPage.click('#reportsTable tbody tr');
    await clientPage.waitForSelector('#detailPanel .card');
    const detailText = await clientPage.locator('#detailBody').innerText();
    ok(detailText.includes('OVERBILLED'), '5.8 client portal detail shows the real OVERBILLED flag from week 1');
    ok(clientPageErrors.length === 0, '5.9 client portal: zero page errors (' + (clientPageErrors[0] || '') + ')');
    await clientCtx.close();
  } finally {
    await browser.close();
  }

  const after = await countBefore();
  console.log('\nCounts after (before cleanup):', JSON.stringify(after));
}

main()
  .catch((err) => { fail++; console.error('\nScript error:', err.stack || err.message); })
  .finally(async () => {
    const beforeCleanup = await countBefore().catch(() => null);
    await cleanup();
    const afterCleanup = await countBefore().catch(() => null);
    if (beforeCleanup && afterCleanup) {
      console.log('Counts: before this run\'s cleanup', JSON.stringify(beforeCleanup), '-> after', JSON.stringify(afterCleanup));
    }
    restoreTrackedDataFiles(trackedDataFileSnapshots);
    if (mongoClient) await mongoClient.close().catch(() => {});
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(fail > 0 ? 1 : 0);
  });
