'use strict';

/**
 * Relay sync test: a case escalated in one browser is there in another.
 *
 * Boots the real server.js in-process against an in-memory Mongo stub (same
 * harness as test-bpo-os-routes.js), then runs the shipped browser script
 * (html/shared/tsm-relay-sync.js) inside simulated browsers that talk to that
 * server with real signed sessions. Each simulated browser has its own
 * localStorage; each tab has its own sessionStorage.
 *
 * Covers:
 *   - routes: off by default, sign-in required, fail-closed without the
 *     encryption key, encrypted at rest, per-client scope, key allow-list,
 *     size and count limits, tombstones, large bodies
 *   - browser script: push, pull, reload exactly once, conflict rules,
 *     deletes, session-only relays across tabs, signed-out and switched-off
 *     behaviour, secrets never sent, opt-out
 *   - every page that touches a relay key loads the script
 *
 * Run: node scripts/test-enterprise-relay-sync.js
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
process.env.TSM_SESSION_SECRET = 'test-session-secret-for-relay-sync';
process.env.TSM_ADMIN_PASSWORD = 'relay-sync-test-admin-pw';
delete process.env.TSM_STRICT_INGEST;

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
const JSONH = who => Object.assign({ 'Content-Type': 'application/json' }, H[who]);
const get = (path, who) => fetch(BASE + path, { headers: who ? H[who] : {} });
const post = (path, who, body, headers) => fetch(BASE + path, { method: 'POST', headers: headers || JSONH(who), body: JSON.stringify(body) });


const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const SCRIPT = fs.readFileSync(path.join(__dirname, '..', 'html', 'shared', 'tsm-relay-sync.js'), 'utf8');
const stored = () => getCollection('tsm_relay_sync')._docs;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function memoryStorage(seed) {
  const m = new Map(Object.entries(seed || {}));
  return {
    get length() { return m.size; },
    key: i => Array.from(m.keys())[i] ?? null,
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: k => { m.delete(k); },
    _map: m,
  };
}

// One page load in one tab. `local` is the device's localStorage (shared by
// its tabs); `session` is this tab's sessionStorage (kept across a reload).
function openPage({ local, session, who }) {
  const listeners = {};
  const page = { reloads: 0, requests: [], events: [], timers: [], local, session };
  const win = {
    localStorage: local,
    sessionStorage: session,
    location: { reload() { page.reloads += 1; } },
    document: { visibilityState: 'visible', addEventListener() {} },
    addEventListener(name, fn) { (listeners[name] = listeners[name] || []).push(fn); },
    dispatchEvent(ev) { page.events.push(ev.type); (listeners[ev.type] || []).forEach(fn => fn(ev)); return true; },
    fetch(url, opts) {
      opts = opts || {};
      page.requests.push({ method: opts.method || 'GET', body: opts.body || null });
      return fetch(BASE + url, { method: opts.method, body: opts.body, headers: Object.assign({}, opts.headers, who ? H[who] : {}) });
    },
  };
  win.window = win;
  const context = vm.createContext({
    window: win, console, JSON, Date, Promise, Number, String, Object, Array, isNaN,
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    setInterval: (fn, ms) => { const t = setInterval(fn, ms); page.timers.push(t); return t; },
    clearInterval,
  });
  vm.runInContext(SCRIPT, context);
  page.sync = win.TSMRelaySync;
  page.fire = name => (listeners[name] || []).forEach(fn => fn({ type: name }));
  page.close = () => page.timers.forEach(clearInterval);
  // Resolves once the initial pull (and the push that follows it) has settled.
  page.settled = async () => { for (let i = 0; i < 40; i++) { await sleep(25); if (page.requests.length && !page._busy()) break; } await sleep(60); };
  page._busy = () => false;
  return page;
}
const relay = (obj) => JSON.stringify(obj);

async function main() {
  const port = await freePort();
  process.env.PORT = String(port);
  BASE = 'http://127.0.0.1:' + port;
  delete process.env.TSM_RELAY_SYNC;
  delete process.env.TSM_DOC_ENCRYPTION_KEY;
  require('../server.js');
  await waitForServer();
  const api = (who, body) => (body
    ? fetch(BASE + '/api/relay-sync', { method: 'POST', headers: JSONH(who), body: JSON.stringify(body) })
    : fetch(BASE + '/api/relay-sync', { headers: who ? H[who] : {} }));
  let r, j;

  // ── routes: gating ────────────────────────────────────────────────────
  r = await api(null); j = await r.json();
  ok(r.status === 200 && j.enabled === false && j.entries.length === 0 && j.scope === undefined, 'routes: a signed-out read gets a quiet "not enabled" with no data (no console error on every page)');
  r = await fetch(BASE + '/api/relay-sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  ok(r.status === 401, 'routes: writing relays requires a signed-in session (401)');
  r = await api('admin'); j = await r.json();
  ok(r.status === 200 && j.enabled === false, 'routes: relay sync is off by default (not enabled until TSM_RELAY_SYNC=1)');
  r = await api('admin', { sets: [{ key: 'TSM_PM_RELAY', value: 'x' }] });
  ok(r.status === 503 && stored().length === 0, 'routes: a write while it is off is refused (503) and stores nothing');
  process.env.TSM_RELAY_SYNC = '1';
  r = await api('admin'); j = await r.json();
  ok(j.enabled === false, 'routes: fails closed without an encryption key, even with the flag on');
  process.env.TSM_DOC_ENCRYPTION_KEY = 'not-a-32-byte-key';
  r = await api('admin', { sets: [{ key: 'TSM_PM_RELAY', value: 'x' }] });
  ok(r.status === 503 && stored().length === 0, 'routes: fails closed on a malformed encryption key');
  process.env.TSM_DOC_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
  r = await api(null); j = await r.json();
  ok(j.enabled === false && j.entries.length === 0, 'routes: even when enabled, a signed-out read gets nothing');
  r = await api('admin'); j = await r.json();
  ok(r.status === 200 && j.ok && j.enabled === true && j.scope === 'internal' && j.entries.length === 0, 'routes: with flag and key set, staff read the internal scope (empty)');

  // ── routes: store, encrypt, scope ─────────────────────────────────────
  const pmCase = relay({ id: 'pm-1', timestamp: '2026-10-11T12:00:00.000Z', docText: 'CONFIDENTIAL lease ledger for 44 Oak St' });
  r = await api('analyst', { sets: [{ key: 'TSM_PM_RELAY', value: pmCase, area: 'both' }] }); j = await r.json();
  ok(r.status === 200 && j.results[0].ok && j.results[0].updatedAt > 0, 'routes: a relay is stored');
  ok(stored().length === 1 && !JSON.stringify(stored()[0]).includes('CONFIDENTIAL') && stored()[0].ciphertext && stored()[0].iv && stored()[0].authTag, 'routes: the stored document is ciphertext, not the relay text');
  ok(stored()[0].scope === 'internal' && stored()[0].updatedBy === 'Ann', 'routes: scope and actor come from the session');
  r = await api('manager'); j = await r.json();
  ok(j.entries.length === 1 && j.entries[0].key === 'TSM_PM_RELAY' && j.entries[0].value === pmCase && j.entries[0].area === 'both' && j.version === j.entries[0].updatedAt, 'routes: another staff session reads it back, decrypted');
  r = await api('client'); j = await r.json();
  ok(r.status === 200 && j.scope === 'client:c1' && j.entries.length === 0, "routes: a client session cannot see staff relays");
  await api('client', { sets: [{ key: 'TSM_BPO_WAR_RELAY', value: relay({ id: 'c1-case' }) }] });
  r = await api('client2'); j = await r.json();
  ok(j.scope === 'client:c2' && j.entries.length === 0, "routes: one client cannot see another client's relays");
  r = await api('admin'); j = await r.json();
  ok(j.entries.length === 1 && j.entries[0].key === 'TSM_PM_RELAY', "routes: staff do not see a client's relays either");
  r = await api('analyst', { sets: [{ key: 'TSM_PM_RELAY', value: pmCase, scope: 'client:c1' }], scope: 'client:c1' });
  ok(stored().filter(d => d.scope === 'client:c1').length === 1, 'routes: a scope sent in the request body is ignored');

  // ── routes: validation ────────────────────────────────────────────────
  r = await api('analyst', { sets: [
    { key: 'tsm_groq_key', value: 'gsk_secret' },
    { key: 'TSM_SESSION_TOKEN_RELAY', value: 'x' },
    { key: 'favourite_colour', value: 'blue' },
    { key: 'TSM_EXEC_RELAY_SHOWN', value: '1' },
    { key: 'TSM_RELAY_SYNC_META', value: '{}' },
    { key: 'TSM_BIG_RELAY', value: 'x'.repeat(256 * 1024 + 1) },
    { key: 'TSM_EMPTY_RELAY', value: '' },
    { key: 'TSM_OBJ_RELAY', value: { $gt: '' } },
    { key: { $gt: '' }, value: 'x' },
    { key: 'TSM_WAR_ROOM_BRIEF', value: relay({ brief: true }), area: 'session' },
    { key: 'tsm_war_relay_finops-suite', value: relay({ v: 'finops-suite' }) },
  ] }); j = await r.json();
  const res = j.results;
  ok(r.status === 200 && res.slice(0, 9).every(x => x.ok === false), 'routes: secrets, non-relay keys, display flags, own bookkeeping, oversize, empty and non-string items are each refused');
  ok(res[9].ok && res[10].ok, 'routes: one bad item never fails the good ones in the same request');
  ok(!stored().some(d => /groq|TOKEN|favourite|SHOWN|SYNC_META|BIG|EMPTY|OBJ/.test(String(d.key))), 'routes: nothing refused was stored');
  r = await api('analyst', { sets: Array.from({ length: 101 }, (_, i) => ({ key: 'TSM_N' + i + '_RELAY', value: 'x' })) });
  ok(r.status === 400, 'routes: more than 100 items in one request is rejected');
  const bigValue = relay({ docText: 'y'.repeat(180 * 1024) });
  r = await api('analyst', { sets: [{ key: 'TSM_LARGE_DOC_RELAY', value: bigValue }] }); j = await r.json();
  ok(r.status === 200 && j.results[0].ok, 'routes: a 180 KB relay gets through (past the default 100 KB body limit)');

  // ── routes: delete = tombstone ────────────────────────────────────────
  r = await api('analyst', { deletes: ['TSM_LARGE_DOC_RELAY', 'TSM_NEVER_STORED_RELAY'] }); j = await r.json();
  ok(j.results.every(x => x.ok), 'routes: deleting a stored relay and an unknown one both succeed');
  r = await api('admin'); j = await r.json();
  const tomb = j.entries.find(e => e.key === 'TSM_LARGE_DOC_RELAY');
  ok(tomb && tomb.deleted === true && tomb.value === undefined && !j.entries.some(e => e.key === 'TSM_NEVER_STORED_RELAY'), 'routes: a deleted relay comes back as a tombstone with no value');
  ok(stored().find(d => d.key === 'TSM_LARGE_DOC_RELAY').ciphertext === null, 'routes: the deleted relay no longer holds any ciphertext');

  // ── routes: age and key rotation ──────────────────────────────────────
  stored().find(d => d.key === 'tsm_war_relay_finops-suite').updatedAt = Date.now() - 8 * 24 * 60 * 60 * 1000;
  r = await api('admin'); j = await r.json();
  ok(!j.entries.some(e => e.key === 'tsm_war_relay_finops-suite'), 'routes: a relay older than a week is no longer offered');
  const goodKey = process.env.TSM_DOC_ENCRYPTION_KEY;
  process.env.TSM_DOC_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
  r = await api('admin'); j = await r.json();
  ok(r.status === 200 && !j.entries.some(e => e.value !== undefined), 'routes: relays written under a different encryption key are skipped, not served as garbage');
  process.env.TSM_DOC_ENCRYPTION_KEY = goodKey;
  stored().length = 0;

  // ── browser script ────────────────────────────────────────────────────
  const A = { local: memoryStorage(), session: memoryStorage() };   // operator's browser
  const B = { local: memoryStorage(), session: memoryStorage() };   // executive's browser
  const caseOne = relay({ id: 'case-1', timestamp: '2026-10-11T12:00:00.000Z', stage: 'war-room' });
  A.local.setItem('TSM_PM_RELAY', caseOne);
  A.session.setItem('TSM_PM_RELAY', caseOne);
  A.local.setItem('tsm_groq_key', 'gsk_live_secret');
  A.local.setItem('TSM_EXEC_RELAY_SHOWN', '1');
  A.local.setItem('unrelated_setting', 'dark');

  let a = openPage(Object.assign({ who: 'analyst' }, A));
  await a.settled();
  ok(stored().length === 1 && stored()[0].key === 'TSM_PM_RELAY', "script: the operator's relay is pushed to the server");
  ok(!a.requests.some(q => q.body && /gsk_live_secret|tsm_groq_key|RELAY_SHOWN|unrelated_setting/.test(q.body)), 'script: an API key, a display flag and unrelated settings are never sent');
  ok(a.reloads === 0, 'script: the browser that wrote the relay does not reload');
  const before = a.requests.length;
  await sleep(2300);
  ok(a.requests.length === before, 'script: with nothing changed, the 2-second check sends nothing');
  a.close();

  let b = openPage(Object.assign({ who: 'manager' }, B));
  await b.settled();
  ok(B.local.getItem('TSM_PM_RELAY') === caseOne && B.session.getItem('TSM_PM_RELAY') === caseOne, "script: the executive's browser receives the relay in both storage areas");
  ok(b.reloads === 1 && b.events.includes('TSM_RELAY_SYNC'), 'script: it reloads once so the page renders the new case');
  ok(B.local.getItem('tsm_groq_key') === null, "script: the operator's API key did not travel");
  b.close();
  b = openPage(Object.assign({ who: 'manager' }, B));               // the page after that reload
  await b.settled();
  ok(b.reloads === 0 && !b.requests.some(q => q.method === 'POST'), 'script: after the reload nothing is pending: no second reload, nothing pushed back');

  // executive edits the case; the operator's browser picks it up
  const caseTwo = relay({ id: 'case-1', timestamp: '2026-10-11T12:30:00.000Z', stage: 'executive', decision: 'approved' });
  B.local.setItem('TSM_PM_RELAY', caseTwo);
  b.fire('TSM_RELAY_EVENT');
  await sleep(250);
  b.close();
  a = openPage(Object.assign({ who: 'analyst' }, A));
  await a.settled();
  ok(A.local.getItem('TSM_PM_RELAY') === caseTwo && a.reloads === 1, "script: a change made on the relay bus is pushed at once and reaches the other browser");
  a.close();

  // conflict: both changed; the payload timestamps decide
  const stale = relay({ id: 'case-1', timestamp: '2026-10-11T11:00:00.000Z', note: 'old local edit' });
  const fresh = relay({ id: 'case-1', timestamp: '2026-10-11T13:00:00.000Z', note: 'newest' });
  A.local.setItem('TSM_PM_RELAY', stale);                            // unsynced local edit, older case time
  await api('manager', { sets: [{ key: 'TSM_PM_RELAY', value: fresh, area: 'both' }] });
  a = openPage(Object.assign({ who: 'analyst' }, A));
  await a.settled();
  ok(A.local.getItem('TSM_PM_RELAY') === fresh, "script: an unsynced local edit gives way when the server's case is the more recent one");
  a.close();
  const newest = relay({ id: 'case-1', timestamp: '2026-10-11T14:00:00.000Z', note: 'local is newest' });
  A.local.setItem('TSM_PM_RELAY', newest);
  await api('manager', { sets: [{ key: 'TSM_PM_RELAY', value: fresh, area: 'both' }] });
  a = openPage(Object.assign({ who: 'analyst' }, A));
  await a.settled();
  r = await api('admin'); j = await r.json();
  ok(A.local.getItem('TSM_PM_RELAY') === newest && j.entries.find(e => e.key === 'TSM_PM_RELAY').value === newest, 'script: an unsynced local edit that is the more recent case is kept and pushed');
  a.close();

  // delete propagates
  A.local.removeItem('TSM_PM_RELAY'); A.session.removeItem('TSM_PM_RELAY');
  a = openPage(Object.assign({ who: 'analyst' }, A));
  await a.settled();
  a.close();
  b = openPage(Object.assign({ who: 'manager' }, B));
  await b.settled();
  ok(B.local.getItem('TSM_PM_RELAY') === null && B.session.getItem('TSM_PM_RELAY') === null, 'script: a relay consumed on one device is removed on the other');
  b.close();

  // session-only relay: a second tab must not read "missing here" as a delete
  A.session.setItem('TSM_WAR_ROOM_BRIEF', relay({ brief: 'tab one', timestamp: '2026-10-11T15:00:00.000Z' }));
  a = openPage(Object.assign({ who: 'analyst' }, A));
  await a.settled();
  a.close();
  const tabTwo = memoryStorage();
  let t2 = openPage({ local: A.local, session: tabTwo, who: 'analyst' });
  await t2.settled();
  r = await api('admin'); j = await r.json();
  const brief = j.entries.find(e => e.key === 'TSM_WAR_ROOM_BRIEF');
  ok(brief && !brief.deleted && A.session.getItem('TSM_WAR_ROOM_BRIEF') !== null, "script: opening a second tab does not delete the first tab's session-only relay");
  ok(tabTwo.getItem('TSM_WAR_ROOM_BRIEF') !== null && A.local.getItem('TSM_WAR_ROOM_BRIEF') === null, 'script: the second tab receives it in its own session storage only');
  t2.close();

  // a value the server refuses is not resent every 2 seconds
  A.local.setItem('TSM_HUGE_RELAY', '€'.repeat(100 * 1024));          // 100K chars, 300 KB as UTF-8
  a = openPage(Object.assign({ who: 'analyst' }, A));
  await a.settled();
  const posts = a.requests.filter(q => q.method === 'POST').length;
  await sleep(2300);
  ok(posts >= 1 && a.requests.filter(q => q.method === 'POST').length === posts, 'script: a relay the server refuses is not resent on every check');
  a.close();
  A.local.removeItem('TSM_HUGE_RELAY');

  // signed out / switched off / opted out
  const C = { local: memoryStorage({ TSM_PM_RELAY: caseOne }), session: memoryStorage() };
  let c = openPage(Object.assign({ who: null }, C));
  await c.settled(); await sleep(2300);
  ok(c.requests.length === 1 && c.reloads === 0 && c.sync.isEnabled() === false && C.local.getItem('TSM_PM_RELAY') === caseOne, 'script: signed out, it asks once, then does nothing and leaves storage alone');
  c.close();
  process.env.TSM_RELAY_SYNC = '0';
  c = openPage(Object.assign({ who: 'analyst' }, C));
  await c.settled(); await sleep(2300);
  ok(c.requests.length === 1 && c.sync.isEnabled() === false, 'script: with the server flag off, it asks once, then does nothing');
  c.close();
  process.env.TSM_RELAY_SYNC = '1';
  C.local.setItem('TSM_RELAY_SYNC_OFF', '1');
  c = openPage(Object.assign({ who: 'analyst' }, C));
  await c.settled();
  ok(c.requests.length === 0, 'script: the per-browser opt-out sends nothing at all');
  c.close();

  // ── every relay page loads the script ─────────────────────────────────
  const tagger = require('./add-relay-sync-tag.js');
  const missing = tagger.missingTag();
  ok(tagger.relayPages().length > 200 && missing.length === 0, 'pages: every page that touches a relay key loads the sync script (' + tagger.relayPages().length + ' pages)' + (missing.length ? ' — missing: ' + missing.slice(0, 5).map(f => path.basename(f)).join(', ') : ''));
  const chainPages = fs.readFileSync(path.join(__dirname, 'demo', 'relay-verticals.conf'), 'utf8').split('\n')
    .filter(l => l && !l.startsWith('#')).flatMap(l => { const [dir, w, s, e] = l.split('|'); return [w, s, e].map(f => path.join('war-rooms', dir, f)); })
    .concat(['healthcare/hc-denial-war-room.html', 'healthcare/hc-main-strategist.html', 'healthcare/executive-portal.html', 'tsm-doc-search-multi.html', 'war-rooms/sampleaerospace-strategist.html', 'plant-incident.html']);
  ok(chainPages.length === 39 && chainPages.every(p => fs.readFileSync(path.join(__dirname, '..', 'html', p), 'utf8').includes(tagger.TAG)), 'pages: all ' + chainPages.length + ' registered chain pages checked carry the tag');
  r = await fetch(BASE + '/shared/tsm-relay-sync.js');
  ok(r.status === 200 && /TSMRelaySync/.test(await r.text()), 'pages: the server serves /shared/tsm-relay-sync.js');
  ok(tagger.usesRelay("localStorage.getItem('TSM_PM_RELAY')") && tagger.usesRelay('TSM.relay.write(DOMAIN, x)') && !tagger.usesRelay("addEventListener('TSM_RELAY_EVENT', f)") && !tagger.usesRelay('<p>hello</p>'), 'pages: the tagging rule matches relay use and ignores the relay event name');

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
