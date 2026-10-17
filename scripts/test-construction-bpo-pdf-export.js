'use strict';
// Server-side PDF export of a published weekly report: staff and the
// owning client only; a draft can't be exported at all (not even by
// staff); a different client, or a non-staff/no-clientId session, gets
// the usual 404/403 this file uses everywhere else. The PDF itself is
// rendered server-side (pdfkit) -- this checks content-type/magic-bytes
// and that a client's copy is sanitized (never a dismissed flag or a
// note), not that pdfkit's internal layout matches pixel-for-pixel.
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
process.env.TSM_SESSION_SECRET = 'test-session-secret-for-construction-bpo-pdf';
process.env.TSM_ADMIN_PASSWORD = 'construction-bpo-pdf-admin-pw';

const auth = require('../middleware/require-auth');
const { PDFParse } = require('pdf-parse');

/** extractPdfText(buf) -> the real rendered text, not raw PDF bytes -- pdfkit
 * compresses its content streams by default, so a literal substring check
 * against the raw buffer would never find real text at all. */
async function extractPdfText(buf) {
  const parser = new PDFParse({ data: buf });
  try { return (await parser.getText()).text; }
  finally { await parser.destroy(); }
}

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
  client1: cookie({ role: 'client', clientId: 'pdfclient-1' }),
  client2: cookie({ role: 'client', clientId: 'pdfclient-2' }),
  rogueNoClientId: cookie({ role: 'viewer' }),
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

  let r = await post('/api/construction-bpo/weekly-reports', 'analyst', {
    clientId: 'pdfclient-1', weekEnding: '2026-06-05',
    // OVERBILLED + LOW_MARGIN -- approve one, dismiss the other, so the
    // client-view PDF can be checked for exactly the approved one.
    jobs: [{ jobId: 'J1', costsToDate: 480000, totalEstimatedCost: 960000, contractValue: 1000000, billedToDate: 700000 }],
  });
  let j = await r.json();
  const reportId = j.report._id;
  const flags = j.report.flags;

  // ── draft: export refused for everyone, even staff ──
  r = await get('/api/construction-bpo/weekly-reports/' + reportId + '/export.pdf', 'analyst');
  j = await r.json();
  ok(r.status === 409 && j.error === 'not_published', 'staff cannot export a draft report (409 not_published)');

  // review the flags: approve the first, dismiss the second, then publish
  await fetch(BASE + '/api/construction-bpo/weekly-reports/' + reportId + '/flags/' + flags[0].flagId, { method: 'PATCH', headers: JSONH('analyst'), body: JSON.stringify({ status: 'approved' }) });
  await fetch(BASE + '/api/construction-bpo/weekly-reports/' + reportId + '/flags/' + flags[1].flagId, { method: 'PATCH', headers: JSONH('analyst'), body: JSON.stringify({ status: 'dismissed', note: 'confirmed fine with PM' }) });
  await post('/api/construction-bpo/weekly-reports/' + reportId + '/publish', 'analyst');

  // ── auth ──
  const rawRes = await fetch(BASE + '/api/construction-bpo/weekly-reports/' + reportId + '/export.pdf');
  ok(rawRes.status === 401, 'unauthenticated export is 401');

  r = await get('/api/construction-bpo/weekly-reports/' + reportId + '/export.pdf', 'rogueNoClientId');
  ok(r.status === 403, 'a non-staff session with no clientId is 403 on export too');

  r = await get('/api/construction-bpo/weekly-reports/' + reportId + '/export.pdf', 'client2');
  ok(r.status === 404, 'a DIFFERENT client is 404, not 403 -- consistent with the JSON route');

  // ── staff export ──
  const staffPdfRes = await fetch(BASE + '/api/construction-bpo/weekly-reports/' + reportId + '/export.pdf', { headers: H.admin });
  ok(staffPdfRes.status === 200, 'staff can export the published report');
  ok(staffPdfRes.headers.get('content-type') === 'application/pdf', 'response content-type is application/pdf');
  ok(/attachment/.test(staffPdfRes.headers.get('content-disposition') || ''), 'response is served as an attachment');
  const staffBuf = Buffer.from(await staffPdfRes.arrayBuffer());
  ok(staffBuf.slice(0, 5).toString('latin1') === '%PDF-', 'response body is a real PDF (starts with the %PDF- magic bytes)');
  const staffText = await extractPdfText(staffBuf);
  ok(staffText.includes('OVERBILLED') && staffText.includes('LOW_MARGIN'), 'staff PDF includes BOTH flags -- approved and dismissed');

  // ── client export: sanitized the same way as the JSON route ──
  const clientPdfRes = await fetch(BASE + '/api/construction-bpo/weekly-reports/' + reportId + '/export.pdf', { headers: H.client1 });
  ok(clientPdfRes.status === 200, 'the owning client can export its own published report');
  const clientBuf = Buffer.from(await clientPdfRes.arrayBuffer());
  const clientText = await extractPdfText(clientBuf);
  const approvedType = flags[0].type, dismissedType = flags[1].type;
  ok(clientText.includes(approvedType), 'client PDF includes the APPROVED flag');
  ok(!clientText.includes(dismissedType), 'client PDF excludes the DISMISSED flag');
  ok(!clientText.includes('confirmed fine with PM'), 'client PDF never includes the analyst note, even for context');

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
