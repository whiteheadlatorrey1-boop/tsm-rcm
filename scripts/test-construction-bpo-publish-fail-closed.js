'use strict';
// Publish must fail CLOSED: if the audit write backing a publish throws,
// the report must be rolled back to 'draft' and the request must fail
// (503) -- never a 200 with a published report that has no audit record
// proving it happened. Verified by monkey-patching store.recordAudit (the
// exact same cached module instance routes/construction-bpo.js requires)
// to throw for exactly one call, then restoring it.
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
process.env.TSM_SESSION_SECRET = 'test-session-secret-for-construction-bpo-fail-closed';
process.env.TSM_ADMIN_PASSWORD = 'construction-bpo-fail-closed-admin-pw';

const auth = require('../middleware/require-auth');
const store = require('../server/construction-bpo/store');

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
const H = { admin: cookie({ role: 'admin' }), analyst: cookie({ role: 'analyst', label: 'Ann' }) };
const JSONH = (who) => Object.assign({ 'Content-Type': 'application/json' }, who ? H[who] : {});
const get = (p, who) => fetch(BASE + p, { headers: who ? H[who] : {} });
const post = (p, who, body) => fetch(BASE + p, { method: 'POST', headers: JSONH(who), body: JSON.stringify(body) });

async function main() {
  const port = await freePort();
  process.env.PORT = String(port);
  BASE = 'http://127.0.0.1:' + port;
  require('../server.js');
  await waitForServer();

  // A draft with one real flag, approved up front so FLAGS_PENDING never
  // gets in the way of isolating the audit-failure path specifically.
  let r = await post('/api/construction-bpo/weekly-reports', 'analyst', {
    clientId: 'failclosed-1', weekEnding: '2026-04-03',
    jobs: [{ jobId: 'J1', costsToDate: 480000, totalEstimatedCost: 960000, contractValue: 1000000, billedToDate: 700000 }],
  });
  let j = await r.json();
  const reportId = j.report._id;
  for (const f of j.report.flags) {
    await fetch(BASE + '/api/construction-bpo/weekly-reports/' + reportId + '/flags/' + f.flagId, { method: 'PATCH', headers: JSONH('analyst'), body: JSON.stringify({ status: 'approved' }) });
  }

  // ── simulate the audit write failing for exactly the publish call ──
  const originalRecordAudit = store.recordAudit;
  store.recordAudit = async (entry, opts) => {
    if (entry.eventType === 'WEEKLY_REPORT_PUBLISHED') throw new Error('simulated Mongo write failure');
    return originalRecordAudit(entry, opts);
  };

  r = await post('/api/construction-bpo/weekly-reports/' + reportId + '/publish', 'analyst');
  j = await r.json();
  ok(r.status === 503 && j.error === 'audit_write_failed', 'publish returns 503 audit_write_failed when the audit write throws (got ' + r.status + ' ' + j.error + ')');

  r = await get('/api/construction-bpo/weekly-reports/' + reportId, 'admin');
  j = await r.json();
  ok(j.report.status === 'draft', 'the report was rolled back to draft -- never left published with no audit record');
  ok(!j.report.publishedBy && !j.report.publishedAt, 'publishedBy/publishedAt were cleared by the rollback');

  const auditAfterFailure = (await (await get('/api/construction-bpo/audit', 'admin')).json()).entries;
  ok(!auditAfterFailure.some((a) => a.eventType === 'WEEKLY_REPORT_PUBLISHED' && a.entityId === reportId), 'no WEEKLY_REPORT_PUBLISHED audit entry exists for this report (consistent with it never having actually published)');

  // ── restore the real recordAudit and confirm publish now succeeds cleanly ──
  store.recordAudit = originalRecordAudit;
  r = await post('/api/construction-bpo/weekly-reports/' + reportId + '/publish', 'analyst');
  j = await r.json();
  ok(r.status === 200 && j.report.status === 'published', 'once recordAudit works again, publishing the SAME report succeeds cleanly (the earlier failure was not permanently stuck)');

  const auditAfterSuccess = (await (await get('/api/construction-bpo/audit', 'admin')).json()).entries;
  ok(auditAfterSuccess.filter((a) => a.eventType === 'WEEKLY_REPORT_PUBLISHED' && a.entityId === reportId).length === 1, 'exactly one WEEKLY_REPORT_PUBLISHED audit entry now exists for this report');

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
