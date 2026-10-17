'use strict';
// Route-level test for GET .../engagements/:clientId/metrics and POST
// .../engagements/:clientId/controller-time -- auth gating and that the
// route actually wires real reports + controller-time entries through to
// server/construction-bpo/metrics.js (unit-tested in isolation by
// scripts/test-construction-bpo-metrics.js). Same in-process harness (fake
// Mongo + real server.js) as test-construction-bpo-routes.js.

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
process.env.TSM_SESSION_SECRET = 'test-session-secret-for-construction-bpo-metrics';
process.env.TSM_ADMIN_PASSWORD = 'construction-bpo-metrics-admin-pw';

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
  client1: cookie({ role: 'client', clientId: 'metricsclient-1' }),
};
const JSONH = (who) => Object.assign({ 'Content-Type': 'application/json' }, who ? H[who] : {});
const get = (p, who) => fetch(BASE + p, { headers: who ? H[who] : {} });
const post = (p, who, body) => fetch(BASE + p, { method: 'POST', headers: JSONH(who), body: JSON.stringify(body) });

async function draftAndPublish(weekEnding, publishedAtOverride) {
  const r = await post('/api/construction-bpo/weekly-reports', 'analyst', {
    clientId: 'metricsclient-1', weekEnding,
    jobs: [{ jobId: 'J1', costsToDate: 480000, totalEstimatedCost: 960000, contractValue: 1000000, billedToDate: 700000 }], // OVERBILLED + LOW_MARGIN
  });
  const j = await r.json();
  const reportId = j.report._id;
  for (const f of j.report.flags) {
    await fetch(BASE + '/api/construction-bpo/weekly-reports/' + reportId + '/flags/' + f.flagId, { method: 'PATCH', headers: JSONH('analyst'), body: JSON.stringify({ status: 'approved' }) });
  }
  const pub = await post('/api/construction-bpo/weekly-reports/' + reportId + '/publish', 'analyst');
  return (await pub.json()).report;
}

async function main() {
  const port = await freePort();
  process.env.PORT = String(port);
  BASE = 'http://127.0.0.1:' + port;
  require('../server.js');
  await waitForServer();

  // ── auth ──
  let r = await get('/api/construction-bpo/engagements/metricsclient-1/metrics');
  ok(r.status === 401, 'unauthenticated metrics is 401');
  r = await get('/api/construction-bpo/engagements/metricsclient-1/metrics', 'client1');
  ok(r.status === 403, 'a client session cannot read metrics (403)');
  r = await post('/api/construction-bpo/engagements/metricsclient-1/controller-time', 'client1', { week: '2026-01-09', minutes: 30 });
  ok(r.status === 403, 'a client session cannot log controller time (403)');

  // ── no data yet: all zeros ──
  r = await get('/api/construction-bpo/engagements/metricsclient-1/metrics', 'admin');
  let j = await r.json();
  ok(r.status === 200 && j.metrics.weeksDelivered === 0, 'metrics for a client with no reports yet is all zeros, not an error');

  // ── publish two weeks, one on time, one late ──
  await draftAndPublish('2030-01-04'); // weekEnding far in the future -- its Phoenix-Wednesday deadline hasn't arrived yet, so publishing "now" is on time
  await draftAndPublish('2000-01-07'); // weekEnding far in the past -- its deadline is long gone, so publishing "now" is unambiguously late

  r = await get('/api/construction-bpo/engagements/metricsclient-1/metrics', 'admin');
  j = await r.json();
  ok(j.metrics.weeksDelivered === 2, 'metrics counts both published weeks as delivered');
  ok(j.metrics.weeksOnTime === 1 && j.metrics.weeksLate === 1, 'one on-time, one late, matching their actual publish timing vs deadline');
  ok(j.metrics.flags.approved === 4, 'flag counts reflect every flag (2 per report x 2 reports), all approved before publish');
  ok(j.metrics.flags.pending === 0 && j.metrics.flags.dismissed === 0, 'no pending or dismissed flags left');

  // ── controller time ──
  r = await post('/api/construction-bpo/engagements/metricsclient-1/controller-time', 'analyst', { week: '2026-01-09', minutes: 45 });
  j = await r.json();
  ok(r.status === 200 && j.entry.minutes === 45, 'analyst logs controller time for a week');

  r = await post('/api/construction-bpo/engagements/metricsclient-1/controller-time', 'analyst', { week: '2026-01-09', minutes: 60 });
  j = await r.json();
  ok(r.status === 200 && j.entry.minutes === 60, 're-logging the same clientId+week upserts (corrects), not double-logs');

  r = await post('/api/construction-bpo/engagements/metricsclient-1/controller-time', 'analyst', { week: '2026-01-16', minutes: 30 });
  ok(r.status === 200, 'a second week logs separately');

  r = await post('/api/construction-bpo/engagements/metricsclient-1/controller-time', 'analyst', { week: '2026-01-23', minutes: -5 });
  ok(r.status === 400, 'negative minutes is 400');

  r = await post('/api/construction-bpo/engagements/metricsclient-1/controller-time', 'analyst', { minutes: 10 });
  ok(r.status === 400, 'missing week is 400');

  r = await get('/api/construction-bpo/engagements/metricsclient-1/metrics', 'admin');
  j = await r.json();
  ok(j.metrics.controllerTime.totalMinutes === 90, 'controller-time total reflects the upsert (60, not 45+60) plus the second week (90 total)');
  ok(j.metrics.controllerTime.entries.length === 2, 'two distinct weeks of controller time on file');

  const auditEntries = (await (await get('/api/construction-bpo/audit', 'admin')).json()).entries;
  ok(auditEntries.filter((a) => a.eventType === 'CONTROLLER_TIME_LOGGED').length === 3, 'every controller-time POST (including the corrected re-log) wrote its own audit entry');

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
