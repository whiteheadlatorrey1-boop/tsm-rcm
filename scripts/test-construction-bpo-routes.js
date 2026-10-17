'use strict';

/**
 * Construction BPO routes: auth gating, the import endpoint, the weekly-
 * report draft/publish review gate, client scoping (own + published only),
 * and the audit trail. Boots the real server.js in-process against an
 * in-memory Mongo stub and drives the real routes with signed sessions
 * (same harness as scripts/test-bpo-executive-recovery-route.js).
 *
 * Run: node scripts/test-construction-bpo-routes.js
 */

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
function matches(doc, query) {
  return Object.keys(query || {}).every((k) => matchValue(doc[k], query[k]));
}
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
process.env.TSM_SESSION_SECRET = 'test-session-secret-for-construction-bpo';
process.env.TSM_ADMIN_PASSWORD = 'construction-bpo-test-admin-pw';

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
  manager: cookie({ role: 'manager', label: 'Maria' }),
  analyst: cookie({ role: 'analyst', label: 'Ann' }),
  client1: cookie({ role: 'client', clientId: 'client-1' }),
  client2: cookie({ role: 'client', clientId: 'client-2' }),
};
const JSONH = (who) => Object.assign({ 'Content-Type': 'application/json' }, who ? H[who] : {});
const get = (p, who) => fetch(BASE + p, { headers: who ? H[who] : {} });
const post = (p, who, body) => fetch(BASE + p, { method: 'POST', headers: JSONH(who), body: JSON.stringify(body) });
const postFile = (p, who, csvText, extraFields) => {
  const form = new FormData();
  form.append('file', new Blob([csvText], { type: 'text/csv' }), 'jobs.csv');
  for (const [k, v] of Object.entries(extraFields || {})) form.append(k, v);
  return fetch(BASE + p, { method: 'POST', headers: who ? H[who] : {}, body: form });
};
const audits = () => getCollection('construction_bpo_audit_logs')._docs;
const reportsDocs = () => getCollection('construction_bpo_weekly_reports')._docs;

async function main() {
  const port = await freePort();
  process.env.PORT = String(port);
  BASE = 'http://127.0.0.1:' + port;
  require('../server.js');
  await waitForServer();

  // ── import ──────────────────────────────────────────────────────────
  const csv = 'jobId,costsToDate,totalEstimatedCost,contractValue,billedToDate\nJ1,500000,1000000,1200000,480000\n';

  let r = await postFile('/api/construction-bpo/import', null, csv);
  ok(r.status === 401, 'unauthenticated import is 401');

  r = await postFile('/api/construction-bpo/import', 'client1', csv);
  ok(r.status === 403, 'a client session cannot import (403)');

  r = await postFile('/api/construction-bpo/import', 'analyst', csv);
  let j = await r.json();
  ok(r.status === 200 && j.ok && j.jobs.length === 1 && j.jobs[0].jobId === 'J1', 'analyst import parses the uploaded CSV');
  ok(j.report.importedRows === 1 && j.report.errors.length === 0, 'import validation report is clean for a well-formed file');

  r = await post('/api/construction-bpo/import', 'analyst', {}); // no file, JSON body instead
  ok(r.status === 400, 'import without a file is 400');

  // ── weekly-reports: draft generation (staff-only) ───────────────────
  const draftInput = {
    clientId: 'client-1', weekEnding: '2026-01-10',
    jobs: [{ jobId: 'J1', costsToDate: 500000, totalEstimatedCost: 1000000, contractValue: 1200000, billedToDate: 480000 }],
  };

  r = await post('/api/construction-bpo/weekly-reports', null, draftInput);
  ok(r.status === 401, 'unauthenticated draft POST is 401');

  r = await post('/api/construction-bpo/weekly-reports', 'client1', draftInput);
  ok(r.status === 403, 'a client session cannot generate a draft (403)');

  r = await post('/api/construction-bpo/weekly-reports', 'analyst', { clientId: 'client-1' });
  j = await r.json();
  ok(r.status === 400 && /weekEnding/.test(j.error), 'missing weekEnding is 400');

  r = await post('/api/construction-bpo/weekly-reports', 'analyst', draftInput);
  j = await r.json();
  ok(r.status === 200 && j.ok && j.report.status === 'draft' && j.report._id === 'client-1__2026-01-10', 'analyst generates a draft report, keyed by clientId__weekEnding');
  const reportId = j.report._id;
  ok(audits().some((a) => a.eventType === 'WEEKLY_REPORT_DRAFTED' && a.entityId === reportId), 'drafting writes an audit entry');

  // re-submitting the same client/week while still draft upserts (not a conflict)
  r = await post('/api/construction-bpo/weekly-reports', 'manager', draftInput);
  ok(r.status === 200, 're-submitting the same draft client/week succeeds (upsert)');
  ok(reportsDocs().filter((d) => d._id === reportId).length === 1, 'still exactly one stored document for that id after the upsert');

  // ── weekly-reports: GET list and GET by id, client scoping ──────────
  r = await get('/api/construction-bpo/weekly-reports/' + reportId);
  ok(r.status === 401, 'unauthenticated GET by id is 401');

  r = await get('/api/construction-bpo/weekly-reports/' + reportId, 'admin');
  j = await r.json();
  ok(r.status === 200 && j.report.status === 'draft', 'staff can view a draft report by id');

  r = await get('/api/construction-bpo/weekly-reports/' + reportId, 'client1');
  ok(r.status === 404, 'a client cannot see its OWN report while still a draft -- not yet published (404, not 403)');

  r = await get('/api/construction-bpo/weekly-reports/nope__2026-01-10', 'admin');
  ok(r.status === 404, 'an unknown report id is 404');

  j = await (await get('/api/construction-bpo/weekly-reports', 'admin')).json();
  ok(j.ok && j.reports.length === 1, 'staff list sees the one report regardless of status');

  j = await (await get('/api/construction-bpo/weekly-reports', 'client1')).json();
  ok(j.ok && j.reports.length === 0, 'a client sees nothing yet -- the only report for its clientId is still a draft');

  // ── weekly-reports: publish (review gate) ───────────────────────────
  r = await post('/api/construction-bpo/weekly-reports/' + reportId + '/publish', null);
  ok(r.status === 401, 'unauthenticated publish is 401');

  r = await post('/api/construction-bpo/weekly-reports/' + reportId + '/publish', 'client1');
  ok(r.status === 403, 'a client session cannot publish (403)');

  r = await post('/api/construction-bpo/weekly-reports/nope__x/publish', 'analyst');
  ok(r.status === 404, 'publishing an unknown report id is 404');

  r = await post('/api/construction-bpo/weekly-reports/' + reportId + '/publish', 'analyst');
  j = await r.json();
  ok(r.status === 200 && j.ok && j.report.status === 'published' && j.report.publishedBy === 'Ann', 'an analyst publishes the report, publishedBy recorded from the session label');
  ok(audits().some((a) => a.eventType === 'WEEKLY_REPORT_PUBLISHED' && a.entityId === reportId), 'publishing writes an audit entry');

  r = await post('/api/construction-bpo/weekly-reports/' + reportId + '/publish', 'manager');
  ok(r.status === 409, 'publishing an already-published report is 409, not a silent no-op');

  // attempting to re-draft a published client/week is also refused
  r = await post('/api/construction-bpo/weekly-reports', 'analyst', draftInput);
  j = await r.json();
  ok(r.status === 409 && j.error === 'already_published', 'regenerating a draft for an already-published client/week is 409, never a silent overwrite');

  // ── after publish: the client can now see its own report ───────────
  r = await get('/api/construction-bpo/weekly-reports/' + reportId, 'client1');
  j = await r.json();
  ok(r.status === 200 && j.report.status === 'published', 'the client can now see its own report now that it is published');

  r = await get('/api/construction-bpo/weekly-reports/' + reportId, 'client2');
  ok(r.status === 404, "a DIFFERENT client is still blocked from client-1's published report (404, not 403)");

  j = await (await get('/api/construction-bpo/weekly-reports', 'client1')).json();
  ok(j.reports.length === 1 && j.reports[0]._id === reportId, 'the client list now includes its own published report');

  // a second client/week, left as a draft, to prove client1's list stays scoped to published+own
  const draft2 = { clientId: 'client-1', weekEnding: '2026-01-17', jobs: [{ jobId: 'J1', costsToDate: 1, totalEstimatedCost: 10, contractValue: 20, billedToDate: 1 }] };
  await post('/api/construction-bpo/weekly-reports', 'analyst', draft2);
  const draft3 = { clientId: 'client-2', weekEnding: '2026-01-10', jobs: [{ jobId: 'K1', costsToDate: 1, totalEstimatedCost: 10, contractValue: 20, billedToDate: 1 }] };
  const r3 = await post('/api/construction-bpo/weekly-reports', 'analyst', draft3);
  const j3 = await r3.json();
  await post('/api/construction-bpo/weekly-reports/' + j3.report._id + '/publish', 'analyst');

  j = await (await get('/api/construction-bpo/weekly-reports', 'client1')).json();
  ok(j.reports.length === 1, "client-1's list excludes its own still-draft week and client-2's published report");

  j = await (await get('/api/construction-bpo/weekly-reports?clientId=client-1', 'admin')).json();
  ok(j.reports.length === 2, 'staff filtering by ?clientId sees both of client-1\'s reports (draft + published)');

  // ── audit (staff-only) ───────────────────────────────────────────────
  r = await get('/api/construction-bpo/audit', 'client1');
  ok(r.status === 403, 'a client cannot read the audit trail');

  j = await (await get('/api/construction-bpo/audit', 'admin')).json();
  ok(j.ok && j.entries.length >= 4, 'staff can read the audit trail (drafts + publishes recorded so far)');

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
