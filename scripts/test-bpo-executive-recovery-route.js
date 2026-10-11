'use strict';

/**
 * Executive Recovery Command Center: the case-picker list route, the
 * computed GET report, the POST save route, and the shipped case-picker
 * page itself. Boots the real server.js in-process against an in-memory
 * Mongo stub and drives the real routes with signed sessions (same harness
 * as scripts/test-bpo-os-routes.js):
 *   - list route: 401 unauthenticated, internal role sees all, client sees
 *     only its own
 *   - GET executive-recovery: 401, 404 unknown case, 200 with report scoped
 *     to one case, exposure taken from a stored BNCA report, client blocked
 *     from another client's case (404)
 *   - POST executive-recovery: 401, 403 for client, 404 unknown case, 400
 *     empty body, 200 for analyst, snapshot stored with
 *     caseId/clientId/actor, audit row written, second save appends, work
 *     item untouched, computed report unchanged
 *   - the shipped page (html/tsm-operational-os-executive.html) in jsdom
 *     against those live routes: picker fills, picking loads, ?caseId deep
 *     link, unknown ID shows the error with no dashboard, client picker
 *     scoped, signed-out prompt links to /login, empty-store message
 *
 * Run: node scripts/test-bpo-executive-recovery-route.js
 */

const Module = require('module');

const collections = new Map();
const clone = v => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

function matchValue(actual, cond) {
  if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
    if ('$in' in cond) return cond.$in.includes(actual);
    return JSON.stringify(actual) === JSON.stringify(cond);
  }
  return actual === cond;
}
function matches(doc, query) {
  return Object.keys(query || {}).every(k => matchValue(doc[k], query[k]));
}
function cmp(a, b) { return String(a ?? '') < String(b ?? '') ? -1 : String(a ?? '') > String(b ?? '') ? 1 : 0; }

function getCollection(name) {
  if (!collections.has(name)) {
    const docs = [];
    collections.set(name, {
      async findOne(query) { return clone(docs.find(d => matches(d, query))) || null; },
      async updateOne(query, update, options = {}) {
        const i = docs.findIndex(d => matches(d, query));
        if (i === -1) {
          if (!options.upsert) return { matchedCount: 0, modifiedCount: 0 };
          docs.push(clone(Object.assign({}, update.$setOnInsert || {}, update.$set || {})));
          return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
        }
        docs[i] = Object.assign({}, docs[i], clone(update.$set || {}));
        return { matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
      },
      async insertOne(doc) { docs.push(clone(doc)); return { acknowledged: true }; },
      async deleteMany(query) { const before = docs.length; for (let i = docs.length - 1; i >= 0; i--) if (matches(docs[i], query)) docs.splice(i, 1); return { deletedCount: before - docs.length }; },
      async createIndex() { return 'ok'; },
      find(query) {
        let rows = docs.filter(d => matches(d, query));
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
  db() { return { collection: name => getCollection(name) }; }
  async close() {}
}
const mongodbPath = require.resolve('mongodb');
const fakeMongo = new Module(mongodbPath, null);
fakeMongo.exports = { MongoClient: FakeMongoClient };
fakeMongo.loaded = true;
require.cache[mongodbPath] = fakeMongo;
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://fake-host/tsm-consultz-test';

{ // never let a developer's real .env override the test credentials
  const dotenvPath = require.resolve('dotenv');
  const fake = new Module(dotenvPath, null);
  fake.exports = { config: () => ({ parsed: {} }), parse: () => ({}) };
  fake.loaded = true;
  require.cache[dotenvPath] = fake;
}
process.env.TSM_SESSION_SECRET = 'test-session-secret-for-executive-recovery';
process.env.TSM_ADMIN_PASSWORD = 'exec-recovery-test-admin-pw';
delete process.env.TSM_STRICT_INGEST;

let JSDOM;
try { ({ JSDOM } = require('jsdom')); } catch (e) { console.log('jsdom unavailable (' + e.message.split('\n')[0] + ') -- skipping page tests'); }
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/require-auth');

let passed = 0;
let failed = 0;
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
    try { const r = await fetch(BASE + '/api/auth/status'); if (r.ok) return; } catch (e) { last = e; }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('server did not start: ' + (last && last.message));
}

const exp = () => Date.now() + 60 * 60 * 1000;
const cookie = payload => ({ Cookie: 'tsm_session=' + encodeURIComponent(auth.signSession(Object.assign({ exp: exp() }, payload))) });
const H = {
  admin: cookie({ role: 'admin' }),
  manager: cookie({ role: 'manager', label: 'Maria' }),
  analyst: cookie({ role: 'analyst', label: 'Ann' }),
  client: cookie({ role: 'client', clientId: 'c1' }),
  client2: cookie({ role: 'client', clientId: 'c2' }),
};
const JSONH = who => Object.assign({ 'Content-Type': 'application/json' }, H[who] || {});
const get = (p, who) => fetch(BASE + p, { headers: who ? H[who] : {} });
const post = (p, who, body) => fetch(BASE + p, { method: 'POST', headers: JSONH(who), body: JSON.stringify(body) });
const work = () => getCollection('bpo_work_items')._docs;
const bncaReports = () => getCollection('bpo_bnca_reports')._docs;
const savedPackages = () => getCollection('bpo_executive_recovery_packages')._docs;
const audits = () => getCollection('bpo_audit_logs')._docs;
const byId = id => work().find(d => d.caseId === id);

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, label, ms = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (fn()) return true; } catch (e) { /* not yet */ } await sleep(40); }
  throw new Error('timed out waiting for: ' + label);
}
const HTML = fs.readFileSync(path.join(__dirname, '..', 'html', 'tsm-operational-os-executive.html'), 'utf8');

function openPage(who, urlPath) {
  const dom = new JSDOM(HTML, {
    runScripts: 'dangerously', pretendToBeVisual: true,
    url: BASE + (urlPath || '/tsm-operational-os-executive.html'),
    beforeParse(win) {
      win.fetch = (u, opts = {}) => fetch(new URL(u, BASE).href, Object.assign({}, opts, { headers: Object.assign({}, opts.headers || {}, who ? H[who] : {}) }));
    },
  });
  return dom;
}

async function main() {
  const port = await freePort();
  process.env.PORT = String(port);
  BASE = 'http://127.0.0.1:' + port;
  require('../server.js');
  await waitForServer();

  // ── Page test: empty store, before any work item exists ──
  if (JSDOM) {
    const dom = await openPage('admin');
    const doc = dom.window.document;
    await until(() => /No BPO cases stored yet/.test(doc.getElementById('status').textContent), 'empty-store message');
    ok(doc.getElementById('dashboard').style.display !== 'block', 'dashboard stays hidden on an empty store');
    dom.window.close();
  } else {
    console.log('SKIP: empty-store page test (no jsdom)');
  }

  const stamp = '2026-09-01T00:00:00.000Z';
  work().push(
    { caseId: 'bpo-1', vertical: 'bpo', clientId: 'c1', stage: 'war-room', status: 'open', priority: 'high', createdAt: stamp, updatedAt: stamp, payload: {} },
    { caseId: 'bpo-2', vertical: 'healthcare', clientId: 'c1', stage: 'strategist', status: 'open', priority: 'critical', createdAt: stamp, updatedAt: stamp, payload: {} },
    { caseId: 'bpo-3', vertical: 'bpo', clientId: 'c2', stage: 'war-room', status: 'open', priority: 'medium', createdAt: stamp, updatedAt: stamp, payload: {} }
  );
  bncaReports().push({ caseId: 'bpo-1', exposure: { currentExposure: 9000 }, confidence: 70, ts: stamp });

  // ── List route ──
  let r = await get('/api/bpo/work-items');
  ok(r.status === 401, 'unauthenticated list is 401');

  let j = await (await get('/api/bpo/work-items', 'admin')).json();
  ok(j.ok && j.workItems.map(w => w.caseId).sort().join() === 'bpo-1,bpo-2,bpo-3', 'an internal role sees every case');

  j = await (await get('/api/bpo/work-items', 'client')).json();
  ok(j.ok && j.workItems.map(w => w.caseId).sort().join() === 'bpo-1,bpo-2', 'a client session sees only its own cases');

  // ── GET executive-recovery ──
  r = await get('/api/bpo/work-items/bpo-1/executive-recovery');
  ok(r.status === 401, 'unauthenticated GET executive-recovery is 401');

  r = await get('/api/bpo/work-items/nope/executive-recovery', 'admin');
  ok(r.status === 404, 'GET on an unknown case is 404');

  j = await (await get('/api/bpo/work-items/bpo-1/executive-recovery', 'admin')).json();
  ok(j.ok && j.caseId === 'bpo-1' && j.report.financials.exposure === 9000, 'GET returns a report scoped to the one case, exposure taken from the stored BNCA report');
  const reportBeforeSave = clone(j.report);

  r = await get('/api/bpo/work-items/bpo-3/executive-recovery', 'client');
  ok(r.status === 404, 'a client is blocked from another client\'s case (404, not 403)');

  // ── POST executive-recovery ──
  r = await post('/api/bpo/work-items/bpo-1/executive-recovery', null, { summary: 'anon' });
  ok(r.status === 401, 'unauthenticated POST is 401');

  r = await post('/api/bpo/work-items/bpo-1/executive-recovery', 'client', { summary: 'client try' });
  ok(r.status === 403, 'a client session cannot POST (403)');

  r = await post('/api/bpo/work-items/nope/executive-recovery', 'admin', { summary: 'x' });
  ok(r.status === 404, 'POST on an unknown case is 404');

  r = await post('/api/bpo/work-items/bpo-1/executive-recovery', 'admin', {});
  j = await r.json();
  ok(r.status === 400 && /recovery package/.test(j.error), 'an empty body is 400');
  ok(savedPackages().length === 0, 'the empty-body attempt saved nothing');

  const before = clone(byId('bpo-1'));
  const pkg1 = { situation: 'first save', strategy: { plan: 'escalate' } };
  r = await post('/api/bpo/work-items/bpo-1/executive-recovery', 'analyst', pkg1);
  j = await r.json();
  ok(r.status === 200 && j.ok && j.executiveRecoveryPackage.situation === 'first save' && j.executiveRecoveryPackage.caseId === 'bpo-1', 'analyst saves a package (200)');
  ok(savedPackages().length === 1, 'one snapshot stored');
  let snap = savedPackages()[0];
  ok(snap.caseId === 'bpo-1' && snap.clientId === 'c1' && snap.actor === 'Ann' && snap.package.situation === 'first save', 'the snapshot carries caseId, clientId and the actor');
  let a = audits()[0];
  ok(audits().length === 1 && a.action === 'work_item.executive_recovery_saved' && a.entityType === 'work_item' && a.entityId === 'bpo-1', 'an audit row records the save');
  ok(JSON.stringify(byId('bpo-1')) === JSON.stringify(before), 'the work item itself is untouched by the save');

  const pkg2 = { situation: 'second save', strategy: { plan: 'settle' } };
  r = await post('/api/bpo/work-items/bpo-1/executive-recovery', 'manager', pkg2);
  ok(r.status === 200, 'a second save succeeds');
  ok(savedPackages().length === 2 && savedPackages()[1].package.situation === 'second save', 'the second save appends rather than overwriting');
  ok(JSON.stringify(byId('bpo-1')) === JSON.stringify(before), 'the work item is still untouched after a second save');

  j = await (await get('/api/bpo/work-items/bpo-1/executive-recovery', 'admin')).json();
  const withoutGeneratedAt = report => Object.assign({}, report, { generatedAt: null });
  ok(JSON.stringify(withoutGeneratedAt(j.report)) === JSON.stringify(withoutGeneratedAt(reportBeforeSave)), 'the computed report is unchanged by either saved snapshot');

  // ── Page tests against the populated store ──
  if (JSDOM) {
    // picker fills, scoped by role
    let dom = await openPage('admin');
    let doc = dom.window.document;
    await until(() => doc.getElementById('casePicker').options.length === 4, 'admin picker fills with every case');
    const values = Array.from(doc.getElementById('casePicker').options).map(o => o.value).filter(Boolean).sort();
    ok(values.join() === 'bpo-1,bpo-2,bpo-3', 'admin picker lists every case');
    const bpo1Option = Array.from(doc.getElementById('casePicker').options).find(o => o.value === 'bpo-1');
    ok(bpo1Option.textContent === 'bpo-1 · bpo · war-room · high', 'option label is caseId · vertical · stage · priority');

    // picking loads
    const picker = doc.getElementById('casePicker');
    picker.value = 'bpo-1';
    picker.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    await until(() => doc.getElementById('dashboard').style.display === 'block', 'dashboard shows after picking a case');
    ok(doc.getElementById('caseId').value === 'bpo-1', 'picking a case fills #caseId');
    ok(/9,000/.test(doc.getElementById('exposure').textContent), 'the picked case\'s package renders');
    dom.window.close();

    // ?caseId deep link
    dom = await openPage('admin', '/tsm-operational-os-executive.html?caseId=bpo-1');
    doc = dom.window.document;
    await until(() => doc.getElementById('dashboard').style.display === 'block', '?caseId deep link loads on open');
    ok(doc.getElementById('caseId').value === 'bpo-1', 'the deep-linked case id prefills the input');
    dom.window.close();

    // unknown id shows the error with no dashboard
    dom = await openPage('admin');
    doc = dom.window.document;
    await until(() => doc.getElementById('casePicker').options.length === 4, 'picker ready before manual entry');
    doc.getElementById('caseId').value = 'does-not-exist';
    doc.querySelector('button').click();
    await until(() => /ERROR/.test(doc.getElementById('status').textContent), 'unknown id shows an error');
    ok(doc.getElementById('dashboard').style.display !== 'block', 'dashboard is hidden after a failed load');
    dom.window.close();

    // client picker scoped
    dom = await openPage('client');
    doc = dom.window.document;
    await until(() => doc.getElementById('casePicker').options.length === 3, 'client picker fills with only its own cases');
    const clientValues = Array.from(doc.getElementById('casePicker').options).map(o => o.value).filter(Boolean).sort();
    ok(clientValues.join() === 'bpo-1,bpo-2', 'client picker is scoped to its own cases');
    dom.window.close();

    // signed-out prompt links to /login
    dom = await openPage(null);
    doc = dom.window.document;
    await until(() => /Sign in to load a recovery package/.test(doc.getElementById('status').textContent), 'signed-out status prompts to sign in');
    ok(doc.getElementById('dashboard').style.display !== 'block', 'dashboard stays hidden when signed out');
    const link = doc.querySelector('#status a');
    ok(link && link.getAttribute('href') === '/login?next=' + encodeURIComponent('/tsm-operational-os-executive.html'), 'the sign-in link points back to this page via ?next=');
    dom.window.close();
  } else {
    console.log('SKIP: page tests against the populated store (no jsdom)');
  }

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
