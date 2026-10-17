'use strict';
// A non-staff session with no clientId (a malformed session, or a role
// this service doesn't recognize) must get 403 on every route -- never
// fall through to a filter that treats a missing clientId as "no filter"
// and returns every client's data. Before this fix, GET
// /weekly-reports[/:id] branched on isStaff and otherwise just read
// s.clientId straight into the query filter with no check that it was
// actually a string; store.listReports() silently drops a falsy
// filter.clientId, so a role of (say) 'viewer' with no clientId at all
// would have seen EVERY client's published reports.
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
      find(query) { let rows = docs.filter((d) => matches(d, query)); const chain = { sort() { return chain; }, limit() { return chain; }, async toArray() { return clone(rows); } }; return chain; },
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
process.env.TSM_SESSION_SECRET = 'test-session-secret-for-construction-bpo-scope';
process.env.TSM_ADMIN_PASSWORD = 'construction-bpo-scope-admin-pw';

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
  client1: cookie({ role: 'client', clientId: 'scopeclient-1' }),
  // A malformed/unrecognized-role session with no clientId at all --
  // verifySession() (middleware/require-auth.js) only guarantees a
  // nonempty role string and a valid exp, nothing about clientId.
  rogueNoClientId: cookie({ role: 'viewer' }),
  // A 'client' role that somehow has no clientId -- shouldn't happen via
  // the real login path, but the guard must not trust the role alone.
  clientRoleNoClientId: cookie({ role: 'client' }),
};
const JSONH = (who) => Object.assign({ 'Content-Type': 'application/json' }, who ? H[who] : {});
const get = (p, who) => fetch(BASE + p, { headers: who ? H[who] : {} });
const post = (p, who, body) => fetch(BASE + p, { method: 'POST', headers: JSONH(who), body: JSON.stringify(body) });

async function main() {
  const port = await freePort();
  process.env.PORT = String(port);
  BASE = 'http://127.0.0.1:' + port;
  require('../server.js');
  await waitForServer();

  // Seed one published report so there is real cross-client data to leak if the guard is broken.
  let r = await post('/api/construction-bpo/weekly-reports', 'analyst', {
    clientId: 'scopeclient-1', weekEnding: '2026-05-01',
    jobs: [{ jobId: 'J1', costsToDate: 100, totalEstimatedCost: 200, contractValue: 300, billedToDate: 100 }],
  });
  let j = await r.json();
  const reportId = j.report._id;
  for (const f of j.report.flags) {
    await fetch(BASE + '/api/construction-bpo/weekly-reports/' + reportId + '/flags/' + f.flagId, { method: 'PATCH', headers: JSONH('analyst'), body: JSON.stringify({ status: 'approved' }) });
  }
  await post('/api/construction-bpo/weekly-reports/' + reportId + '/publish', 'analyst');

  // ── GET list ──
  r = await get('/api/construction-bpo/weekly-reports', 'rogueNoClientId');
  j = await r.json();
  ok(r.status === 403 && j.error === 'forbidden', 'GET list: a role this service does not recognize, with no clientId, is 403 forbidden (not an empty/leaked list)');

  r = await get('/api/construction-bpo/weekly-reports', 'clientRoleNoClientId');
  ok(r.status === 403, 'GET list: role "client" with no clientId at all is still 403 (the guard checks clientId itself, not just the role name)');

  r = await get('/api/construction-bpo/weekly-reports', 'client1');
  j = await r.json();
  ok(r.status === 200 && j.reports.length === 1, 'GET list: a real client session with its own clientId still works normally');

  // ── GET by id ──
  r = await get('/api/construction-bpo/weekly-reports/' + reportId, 'rogueNoClientId');
  ok(r.status === 403, 'GET by id: no-clientId non-staff session is 403, not 404 (403 happens before the lookup even runs)');

  r = await get('/api/construction-bpo/weekly-reports/' + reportId, 'client1');
  ok(r.status === 200, 'GET by id: a real client session can still read its own published report');

  // ── staff-only routes already reject non-staff regardless of clientId (unchanged, confirmed still true) ──
  r = await post('/api/construction-bpo/weekly-reports', 'rogueNoClientId', { clientId: 'x', weekEnding: '2026-05-08' });
  ok(r.status === 403, 'staff-only draft route still rejects a non-staff/no-clientId session (staffOnly, unaffected by this change)');

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
