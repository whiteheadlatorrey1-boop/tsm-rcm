'use strict';

/**
 * Phase 14 console UI test (optional; needs jsdom + Node >= 22.22, so it is
 * NOT part of `npm test`). Loads html/tsm-operational-os-console.html in jsdom
 * against the real server (in-memory Mongo stub) with signed sessions:
 *   - staff sessions get the app; a client session gets the gate
 *   - KPIs, queue rows, case detail and audit trail render from live data
 *   - the role decides which action forms appear
 *   - submitting the reassign form calls the real route, updates the page, and
 *     writes the audit row
 *   - hostile text (markup in a claim id, an owner, a reason) is rendered as
 *     text, never as HTML
 *
 * Run: node scripts/test-os-console-ui.js
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
process.env.TSM_SESSION_SECRET = 'test-session-secret-for-os-routes';
process.env.TSM_ADMIN_PASSWORD = 'os-routes-test-admin-pw';
delete process.env.TSM_STRICT_INGEST;

let JSDOM;
try { ({ JSDOM } = require('jsdom')); } catch (e) { console.log('jsdom unavailable (' + e.message.split('\n')[0] + ') -- skipping console UI test'); process.exit(0); }
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
  ghost: cookie({ role: 'manager', label: 'Gone', staffId: 'staff-that-does-not-exist' }),
};
const JSONH = who => Object.assign({ 'Content-Type': 'application/json' }, H[who]);
const get = (path, who) => fetch(BASE + path, { headers: who ? H[who] : {} });
const post = (path, who, body, headers) => fetch(BASE + path, { method: 'POST', headers: headers || JSONH(who), body: JSON.stringify(body) });
const act = (caseId, action, who, body, headers) => post('/api/bpo/os/cases/' + encodeURIComponent(caseId) + '/' + action, who, body, headers);
const work = () => getCollection('bpo_work_items')._docs;
const audits = () => getCollection('bpo_audit_logs')._docs;
const byId = id => work().find(d => d.caseId === id);

const FULL_HC = {
  claimId: 'AZ-BCBS-1', payer: 'Blue Cross', denialCategory: 'medical_necessity', denialReasonCode: 'CO-50',
  financialExposure: 4850, evidenceProvenance: [{ field: 'claimId', source: 'doc' }], recoveryLikelihood: 'MODERATE',
  confidence: 65, appealable: true,
};
const DAY = 86400000;


const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, label, ms = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (fn()) return true; } catch (e) { /* not yet */ } await sleep(40); }
  throw new Error('timed out waiting for: ' + label);
}
const HTML = fs.readFileSync(path.join(__dirname, '..', 'html', 'tsm-operational-os-console.html'), 'utf8');

async function openPage(who) {
  const dom = new JSDOM(HTML, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: BASE + '/tsm-operational-os-console.html',
    beforeParse(win) {
      win.fetch = (u, opts = {}) => fetch(new URL(u, BASE).href, Object.assign({}, opts, { headers: Object.assign({}, opts.headers || {}, H[who]) }));
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

  const stamp = '2026-09-01T00:00:00.000Z';
  work().push(
    { caseId: 'hc-1', vertical: 'healthcare', clientId: 'c1', stage: 'ready-for-review', status: 'open', priority: 'medium', owner: 'ann', createdAt: stamp, updatedAt: stamp, dueDate: new Date(Date.now() - 5 * DAY).toISOString(), payload: { structuredCase: FULL_HC } },
    { caseId: 'ins-1', vertical: 'insurance', clientId: 'c2', stage: 'strategist', status: 'open', priority: 'high', createdAt: stamp, updatedAt: stamp, payload: { structuredCase: { financialExposure: 12000 } } },
    { caseId: 'evil-1', vertical: 'bpo', stage: 'war-room', status: 'open', priority: 'low', owner: '<b id="evil-owner">x</b>', createdAt: stamp, updatedAt: stamp, payload: { structuredCase: { claimId: '<img src=x id="evil-img" onerror="window.__pwned=1">' } } }
  );

  // ── client session: gate, not app ──
  let dom = await openPage('client');
  await until(() => dom.window.document.getElementById('gate').style.display === 'flex', 'client gate');
  ok(dom.window.document.getElementById('app').style.display !== 'block', 'a client session sees the sign-in gate, not the console');
  dom.window.close();

  // ── manager ──
  dom = await openPage('manager');
  let doc = dom.window.document;
  await until(() => doc.querySelectorAll('#queue tr.row').length === 3, 'queue rows');
  ok(doc.getElementById('app').style.display === 'block' && doc.getElementById('user-role').textContent === 'manager', 'a staff session gets the console');
  ok(/16,850\.00/.test(doc.getElementById('summary').textContent) && /Overdue/.test(doc.getElementById('summary').textContent), 'summary KPIs render (open exposure = known exposure only)');
  ok(doc.querySelectorAll('#queue tr.row')[0].textContent.includes('AZ-BCBS-1') && /overdue 5d/.test(doc.querySelectorAll('#queue tr.row')[0].textContent), 'the overdue healthcare case is first, with its days overdue');
  ok(!doc.querySelector('#queue img') && !doc.getElementById('evil-img') && !doc.getElementById('evil-owner') && dom.window.__pwned === undefined, 'markup in a claim id or owner is rendered as text, not HTML');
  ok(doc.getElementById('queue').textContent.includes('<img src=x'), 'the hostile text is visible literally');

  doc.querySelector('#queue tr.row').click();
  await until(() => doc.querySelectorAll('#detail form.act').length > 0, 'case detail');
  ok(Array.from(doc.querySelectorAll('#detail form.act')).map(f => f.dataset.action).join() === 'reassign,escalate,priority', 'manager sees reassign / escalate / priority forms');
  ok(/Audit trail/.test(doc.getElementById('detail').textContent), 'audit trail section is shown');

  const form = doc.querySelector('form.act[data-action="reassign"]');
  form.querySelector('[name=owner]').value = 'Bob <i id="evil-i">Smith</i>';
  form.querySelector('[name=reason]').value = 'Ann is out <script>window.__pwned=2</script>';
  form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await until(() => /Done/.test(doc.getElementById('act-msg') ? doc.getElementById('act-msg').textContent : ''), 'action result');
  ok(byId('hc-1').owner === 'Bob <i id="evil-i">Smith</i>' && audits().length === 1 && audits()[0].detail.reason.includes('Ann is out'), 'the form called the real route: owner changed and an audit row was written');
  ok(!doc.getElementById('evil-i') && dom.window.__pwned === undefined && doc.getElementById('detail').textContent.includes('Bob <i id="evil-i">Smith</i>'), 'owner and reason echoed back in the detail and audit table as text, not HTML');
  ok(/work_item\.reassign/.test(doc.getElementById('detail').textContent), 'the new audit row appears in the trail');

  // a server-side rejection is shown, not swallowed
  const form2 = doc.querySelector('form.act[data-action="priority"]');
  form2.querySelector('[name=priority]').value = 'medium';
  form2.querySelector('[name=reason]').value = 'no change at all';
  form2.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await until(() => /already medium/.test(doc.getElementById('act-msg').textContent), 'server error message');
  ok(true, 'a server-side rejection (409) is shown to the user');
  dom.window.close();

  // ── analyst: no reassign form ──
  dom = await openPage('analyst');
  doc = dom.window.document;
  await until(() => doc.querySelectorAll('#queue tr.row').length === 3, 'analyst queue');
  doc.querySelector('#queue tr.row').click();
  await until(() => doc.querySelectorAll('#detail form.act').length > 0, 'analyst detail');
  ok(Array.from(doc.querySelectorAll('#detail form.act')).map(f => f.dataset.action).join() === 'escalate,priority', 'an analyst is only offered escalate and priority');
  dom.window.close();

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
