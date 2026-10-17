'use strict';
// Engagements: staff-only CRUD for a client's standing config
// { clientId, name, thresholds, coSlaHours, columnMap, source }, and the
// two places that now consult it instead of (or alongside) the request
// body: weekly-report creation (thresholds/coSlaHours) and import
// (source/columnMap). Same in-process harness (fake Mongo + real
// server.js) as test-construction-bpo-routes.js.

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
      async deleteOne(query) {
        const i = docs.findIndex((d) => matches(d, query));
        if (i === -1) return { deletedCount: 0 };
        docs.splice(i, 1);
        return { deletedCount: 1 };
      },
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
process.env.TSM_SESSION_SECRET = 'test-session-secret-for-construction-bpo-engagements';
process.env.TSM_ADMIN_PASSWORD = 'construction-bpo-engagements-admin-pw';

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
  client1: cookie({ role: 'client', clientId: 'engclient-1' }),
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

async function main() {
  const port = await freePort();
  process.env.PORT = String(port);
  BASE = 'http://127.0.0.1:' + port;
  require('../server.js');
  await waitForServer();

  // ── CRUD auth ──
  let r = await post('/api/construction-bpo/engagements', null, { clientId: 'engclient-1' });
  ok(r.status === 401, 'unauthenticated create is 401');
  r = await post('/api/construction-bpo/engagements', 'client1', { clientId: 'engclient-1' });
  ok(r.status === 403, 'a client session cannot create an engagement (403)');

  // ── create ──
  r = await post('/api/construction-bpo/engagements', 'analyst', {
    clientId: 'engclient-1', name: 'Engagement Test GC',
    thresholds: { wip: { lowMarginPct: 0.08 }, retainage: { retainageVariancePct: 0.05 } },
    coSlaHours: 48,
    source: 'procore',
    columnMap: { jobId: 'My Job Col' },
  });
  let j = await r.json();
  ok(r.status === 200 && j.ok && j.engagement.clientId === 'engclient-1', 'analyst creates an engagement');
  ok(j.engagement.coSlaHours === 48 && j.engagement.source === 'procore', 'created engagement stores coSlaHours/source as given');

  r = await post('/api/construction-bpo/engagements', 'analyst', { clientId: 'engclient-1', name: 'Dup' });
  ok(r.status === 409, 're-creating the same clientId is 409 already_exists');

  // ── read ──
  r = await get('/api/construction-bpo/engagements/engclient-1', 'admin');
  j = await r.json();
  ok(r.status === 200 && j.engagement.name === 'Engagement Test GC', 'staff reads the engagement by clientId');

  r = await get('/api/construction-bpo/engagements/no-such-client', 'admin');
  ok(r.status === 404, 'reading an unknown engagement is 404');

  r = await get('/api/construction-bpo/engagements', 'admin');
  j = await r.json();
  ok(r.status === 200 && j.engagements.some((e) => e.clientId === 'engclient-1'), 'staff lists all engagements');

  // ── weekly-report creation uses the engagement's thresholds ──
  // margin = (500000-465000)/500000 = 7% -- above the default 5%
  // lowMarginPct (no flag under the default), below the engagement's
  // overridden 8% (flags under the engagement) -- this is the one number
  // that distinguishes "the engagement's thresholds were actually
  // applied" from "the hardcoded default was used instead."
  const draftInput2 = {
    clientId: 'engclient-1', weekEnding: '2026-03-13',
    jobs: [{ jobId: 'J1', costsToDate: 465000, totalEstimatedCost: 465000, contractValue: 500000, billedToDate: 465000 }],
  };
  r = await post('/api/construction-bpo/weekly-reports', 'analyst', draftInput2);
  j = await r.json();
  ok(r.status === 200 && j.ok, 'draft generated for a week using the engagement thresholds');
  const lowMarginFlags = j.report.flags.filter((f) => f.type === 'LOW_MARGIN');
  ok(lowMarginFlags.length === 1, 'LOW_MARGIN fires at 7% margin -- only explained by the engagement\'s 8% threshold, not the 5% default');

  // thresholds in the request body override the engagement's for this one call
  r = await post('/api/construction-bpo/weekly-reports', 'analyst', Object.assign({}, draftInput2, { weekEnding: '2026-03-20', thresholds: { wip: { lowMarginPct: 0.01 } } }));
  j = await r.json();
  ok(r.status === 200 && j.report.flags.filter((f) => f.type === 'LOW_MARGIN').length === 0, 'a request-body thresholds override wins over the engagement (1% threshold -> 7% margin no longer flags)');

  const auditEntries = await (await get('/api/construction-bpo/audit', 'admin')).json();
  const draftedAudit = auditEntries.entries.filter((a) => a.eventType === 'WEEKLY_REPORT_DRAFTED' && a.entityId.startsWith('engclient-1__2026-03-2'));
  ok(draftedAudit.length === 1 && draftedAudit[0].metadata.thresholdOverride === true, 'the threshold override is recorded in the audit metadata');

  // ── import uses the engagement's source/columnMap ──
  // The engagement's columnMap maps canonical jobId -> header "My Job Col".
  const csv = 'My Job Col,costsToDate,totalEstimatedCost,contractValue,billedToDate\nENG-J1,100,200,300,90\n';
  r = await postFile('/api/construction-bpo/import', 'analyst', csv, { clientId: 'engclient-1' });
  j = await r.json();
  ok(r.status === 200 && j.ok && j.jobs.length === 1 && j.jobs[0].jobId === 'ENG-J1', 'import resolves the jobId column via the engagement\'s saved columnMap, with no columnMap in this request');

  // a request-body columnMap overrides the engagement's
  const csv2 = 'Totally Different Col,costsToDate\nENG-J2,50\n';
  r = await postFile('/api/construction-bpo/import', 'analyst', csv2, { clientId: 'engclient-1', columnMap: JSON.stringify({ jobId: 'Totally Different Col' }) });
  j = await r.json();
  ok(r.status === 200 && j.jobs.length === 1 && j.jobs[0].jobId === 'ENG-J2', 'a request-body columnMap overrides the engagement\'s for this one import');

  const importAudit = (await (await get('/api/construction-bpo/audit', 'admin')).json()).entries.filter((a) => a.eventType === 'IMPORT');
  ok(importAudit.length === 2, 'both imports (engagement default + request override) wrote an IMPORT audit entry');
  ok(importAudit.some((a) => a.metadata.columnMapOverride === true) && importAudit.some((a) => a.metadata.columnMapOverride === false), 'the audit distinguishes which import used the override vs the engagement default');

  // ── update / delete ──
  r = await patchReq('/api/construction-bpo/engagements/engclient-1', 'analyst', { coSlaHours: 96 });
  j = await r.json();
  ok(r.status === 200 && j.engagement.coSlaHours === 96 && j.engagement.source === 'procore', 'PATCH merges fields, leaving others (source) untouched');

  r = await patchReq('/api/construction-bpo/engagements/no-such-client', 'analyst', { coSlaHours: 1 });
  ok(r.status === 404, 'PATCHing an unknown engagement is 404');

  r = await del('/api/construction-bpo/engagements/engclient-1', 'client1');
  ok(r.status === 403, 'a client cannot delete an engagement');

  r = await del('/api/construction-bpo/engagements/engclient-1', 'analyst');
  ok(r.status === 200, 'analyst deletes the engagement');
  r = await get('/api/construction-bpo/engagements/engclient-1', 'admin');
  ok(r.status === 404, 'the engagement is actually gone after delete');

  r = await del('/api/construction-bpo/engagements/engclient-1', 'analyst');
  ok(r.status === 404, 'deleting an already-deleted engagement is 404, not a silent success');

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
