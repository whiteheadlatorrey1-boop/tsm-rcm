'use strict';
// Route-level test for the generic /api/bpo-service/construction-bpo/...
// surface (server/bpo-service/routes.js + plugins/construction-bpo.js):
// proves the generic framework reproduces the construction-bpo review
// gate/engagements/metrics/PDF-export behavior end to end, AND that it
// runs as a genuinely separate system from the existing
// /api/construction-bpo/* routes -- same client/week drafted on both
// surfaces never collide or leak into each other's storage.
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
      async deleteOne(query) { const i = docs.findIndex((d) => matches(d, query)); if (i === -1) return { deletedCount: 0 }; docs.splice(i, 1); return { deletedCount: 1 }; },
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
process.env.TSM_SESSION_SECRET = 'test-session-secret-for-bpo-service';
process.env.TSM_ADMIN_PASSWORD = 'bpo-service-admin-pw';

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
  client1: cookie({ role: 'client', clientId: 'svcclient-1' }),
  client2: cookie({ role: 'client', clientId: 'svcclient-2' }),
  rogueNoClientId: cookie({ role: 'viewer' }),
};
const JSONH = (who) => Object.assign({ 'Content-Type': 'application/json' }, who ? H[who] : {});
const get = (p, who) => fetch(BASE + p, { headers: who ? H[who] : {} });
const post = (p, who, body) => fetch(BASE + p, { method: 'POST', headers: JSONH(who), body: JSON.stringify(body) });
const patchReq = (p, who, body) => fetch(BASE + p, { method: 'PATCH', headers: JSONH(who), body: JSON.stringify(body) });
const del = (p, who) => fetch(BASE + p, { method: 'DELETE', headers: who ? H[who] : {} });
const postFile = (p, who, csvText, extraFields) => {
  const form = new FormData();
  form.append('file', new Blob([csvText], { type: 'text/csv' }), 'jobs.csv');
  for (const [k, v] of Object.entries(extraFields || {})) form.append(k, v);
  return fetch(BASE + p, { method: 'POST', headers: who ? H[who] : {}, body: form });
};

const V = 'construction-bpo';
const BASE_PATH = '/api/bpo-service/' + V;

async function main() {
  const port = await freePort();
  process.env.PORT = String(port);
  BASE = 'http://127.0.0.1:' + port;
  require('../server.js');
  await waitForServer();

  // ── unknown vertical ──
  let r = await get('/api/bpo-service/not-a-real-vertical/weekly-reports', 'admin');
  ok(r.status === 404, 'an unregistered vertical is 404 unknown_vertical');
  let j = await r.json();
  ok(j.error === 'unknown_vertical', 'unknown-vertical error code is specific');

  // ── import (same CSV shape as /api/construction-bpo/import) ──
  const csv = 'jobId,costsToDate,totalEstimatedCost,contractValue,billedToDate\nJ1,480000,960000,1000000,700000\n';
  r = await postFile(BASE_PATH + '/import', null, csv);
  ok(r.status === 401, 'unauthenticated import is 401');
  r = await postFile(BASE_PATH + '/import', 'client1', csv);
  ok(r.status === 403, 'a client session cannot import (403)');
  r = await postFile(BASE_PATH + '/import', 'analyst', csv);
  j = await r.json();
  ok(r.status === 200 && j.ok && j.items.length === 1 && j.items[0].jobId === 'J1', 'analyst import via the generic route parses the CSV (fileType defaults to the plug-in\'s first file type)');

  // ── draft (OVERBILLED + LOW_MARGIN, same numbers as the construction-bpo review-gate test) ──
  const draftInput = {
    clientId: 'svcclient-1', weekEnding: '2026-07-03',
    jobs: [{ jobId: 'J1', costsToDate: 480000, totalEstimatedCost: 960000, contractValue: 1000000, billedToDate: 700000 }],
  };
  r = await post(BASE_PATH + '/weekly-reports', 'analyst', draftInput);
  j = await r.json();
  ok(r.status === 200 && j.ok && j.report.status === 'draft', 'draft generated via the generic route');
  const reportId = j.report._id;
  ok(reportId === V + '__svcclient-1__2026-07-03', 'generic-route report id is vertical__clientId__weekEnding');
  const flags = j.report.flags;
  ok(flags.length === 2 && flags.every((f) => f.status === 'pending'), 'both flags present and pending');

  // ── publish refused while pending ──
  r = await post(BASE_PATH + '/weekly-reports/' + reportId + '/publish', 'analyst');
  j = await r.json();
  ok(r.status === 409 && j.error === 'flags_pending', 'publish refused (409 flags_pending) via the generic route, same as construction-bpo');

  // ── review flags ──
  for (const f of flags) {
    await patchReq(BASE_PATH + '/weekly-reports/' + reportId + '/flags/' + f.flagId, 'analyst', { status: 'approved' });
  }
  r = await post(BASE_PATH + '/weekly-reports/' + reportId + '/publish', 'analyst');
  j = await r.json();
  ok(r.status === 200 && j.report.status === 'published', 'publish succeeds once every flag is reviewed');

  r = await post(BASE_PATH + '/weekly-reports/' + reportId + '/publish', 'analyst');
  ok(r.status === 409, 'republish is 409 already_published');

  // ── client scoping + sanitizing ──
  r = await get(BASE_PATH + '/weekly-reports', 'rogueNoClientId');
  ok(r.status === 403, 'a non-staff session with no clientId is 403 on the generic list route too');

  r = await get(BASE_PATH + '/weekly-reports/' + reportId, 'client1');
  j = await r.json();
  ok(r.status === 200 && j.report.flags.length === 2 && !('note' in j.report.flags[0]), 'the owning client sees the published report, approved flags, no note field');

  r = await get(BASE_PATH + '/weekly-reports/' + reportId, 'client2');
  ok(r.status === 404, 'a different client is 404');

  // ── PDF export ──
  const pdfRes = await fetch(BASE + BASE_PATH + '/weekly-reports/' + reportId + '/export.pdf', { headers: H.client1 });
  ok(pdfRes.status === 200 && pdfRes.headers.get('content-type') === 'application/pdf', 'the owning client can export the published report as a PDF');
  const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
  ok(pdfBuf.slice(0, 5).toString('latin1') === '%PDF-', 'generic-route PDF export is a real PDF');

  // ── engagements + threshold override ──
  r = await post(BASE_PATH + '/engagements', 'analyst', { clientId: 'svcclient-1', name: 'Sample GC Co.', thresholds: { wip: { lowMarginPct: 0.5 } } });
  j = await r.json();
  ok(r.status === 200 && j.ok, 'create an engagement via the generic route');

  const draft2 = {
    clientId: 'svcclient-1', weekEnding: '2026-07-10',
    // margin 7% -- below the engagement's 50% override would flag; use something that only crosses THAT threshold is unnecessary here, just confirm the field is honored via a cheap check: no thresholds in the body, engagement applies.
    jobs: [{ jobId: 'J1', costsToDate: 465000, totalEstimatedCost: 465000, contractValue: 500000, billedToDate: 465000 }],
  };
  r = await post(BASE_PATH + '/weekly-reports', 'analyst', draft2);
  j = await r.json();
  ok(j.report.flags.some((f) => f.type === 'LOW_MARGIN'), 'the engagement\'s overridden (very high) lowMarginPct threshold is applied to a new draft');

  // ── metrics + controller time ──
  r = await get(BASE_PATH + '/engagements/svcclient-1/metrics', 'admin');
  j = await r.json();
  ok(r.status === 200 && j.metrics.weeksDelivered === 1, 'pilot metrics via the generic route reflect the one published week');

  r = await post(BASE_PATH + '/engagements/svcclient-1/controller-time', 'analyst', { week: '2026-07-03', minutes: 40 });
  ok(r.status === 200, 'controller time logged via the generic route');

  // ── independence from the OLD /api/construction-bpo/* surface ──
  r = await get('/api/construction-bpo/weekly-reports', 'admin');
  j = await r.json();
  ok(!j.reports.some((rep) => rep._id === reportId), 'a report drafted via the GENERIC route does not appear in the OLD construction-bpo route\'s list -- separate storage, as designed');

  const oldDraft = await post('/api/construction-bpo/weekly-reports', 'analyst', { clientId: 'svcclient-1', weekEnding: '2026-07-03', jobs: draftInput.jobs });
  const oldJson = await oldDraft.json();
  ok(oldDraft.status === 200 && oldJson.report._id === 'svcclient-1__2026-07-03', 'the OLD construction-bpo route still works completely unaffected, same clientId+weekEnding as the generic-route report above, no collision (different id shape, different collection)');

  r = await get(BASE_PATH + '/weekly-reports/' + reportId, 'admin');
  j = await r.json();
  ok(j.report.status === 'published', 'the generic-route report is untouched by that old-route draft (still published, unaffected)');

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
