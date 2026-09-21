'use strict';

/**
 * Phase 14 live route test: the Operational OS console API + the Healthcare
 * ingest gate. Boots the real server.js in-process against an in-memory
 * Mongo stub and drives the real routes with signed sessions:
 *   - only internal roles reach /api/bpo/os/* (401 unauthenticated, 403 client)
 *   - adapters / queue / summary / case detail over Healthcare, Insurance, BPO
 *     and an unadapted vertical
 *   - reassign / escalate / de-escalate / priority: role policy, reason
 *     required, content-type enforced, state conflicts, unknown case
 *   - every action leaves an audit row with actor, role, reason, from -> to
 *   - actions touch ONLY their own fields (stage/status/payload untouched, no
 *     SLA event written)
 *   - a failed audit write rolls the change back; a concurrent change is a 409
 *   - a deactivated staff account cannot write
 *   - the ingest gate rejects an incomplete Healthcare handoff on CREATE only
 *
 * Run: node scripts/test-bpo-os-routes.js
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

async function main() {
  const port = await freePort();
  process.env.PORT = String(port);
  BASE = 'http://127.0.0.1:' + port;
  require('../server.js');
  await waitForServer();

  const stamp = '2026-09-01T00:00:00.000Z';
  work().push(
    { caseId: 'hc-1', vertical: 'healthcare', clientId: 'c1', stage: 'ready-for-review', status: 'open', priority: 'medium', owner: 'ann', createdAt: stamp, updatedAt: stamp, dueDate: new Date(Date.now() - 5 * DAY).toISOString(), payload: { structuredCase: FULL_HC, marker: 'keep-me' } },
    { caseId: 'ins-1', vertical: 'insurance', clientId: 'c2', stage: 'strategist', status: 'open', priority: 'high', createdAt: stamp, updatedAt: stamp, payload: { structuredCase: { financialExposure: 12000, deadline: new Date(Date.now() + 5 * DAY).toISOString() } } },
    { caseId: 'bpo-1', vertical: 'bpo', clientId: 'c1', stage: 'war-room', status: 'open', priority: 'low', owner: 'bob', createdAt: stamp, updatedAt: stamp, payload: {} },
    { caseId: 'gen-1', vertical: 'mortgage', stage: 'intake', status: 'open', createdAt: stamp, updatedAt: stamp, payload: {} },
    { caseId: 'done-1', vertical: 'healthcare', clientId: 'c1', stage: 'closed', status: 'resolved', recoveryStatus: 'RECOVERED', originalExposure: 100, recoveredAmount: 100, createdAt: stamp, updatedAt: stamp, payload: {} }
  );

  // ── Access control ──
  let r = await get('/api/bpo/os/queue');
  ok(r.status === 401, 'unauthenticated queue is 401');
  r = await get('/api/bpo/os/queue', 'client');
  ok(r.status === 403, 'a client session is refused (403)');
  r = await act('hc-1', 'escalate', 'client', { reason: 'let me in' });
  ok(r.status === 403, 'a client session cannot act (403)');
  r = await post('/api/bpo/os/cases/hc-1/escalate', null, { reason: 'anon' }, { 'Content-Type': 'application/json' });
  ok(r.status === 401, 'unauthenticated action is 401');
  r = await get('/api/bpo/os/queue', 'analyst');
  ok(r.status === 200, 'analyst can read the queue');

  // ── Adapters ──
  let j = await (await get('/api/bpo/os/adapters', 'manager')).json();
  ok(j.ok && j.adapters.map(a => a.id).sort().join() === 'bpo,healthcare,insurance' && j.actions.join() === 'reassign,escalate,de-escalate,priority', 'adapters endpoint lists the three verticals and the safe actions');

  // ── Queue / summary / detail ──
  j = await (await get('/api/bpo/os/queue', 'manager')).json();
  ok(j.ok && j.queue.total === 4 && j.queue.cases.map(c => c.caseId).join() === 'hc-1,ins-1,gen-1,bpo-1', 'unified queue across verticals: overdue first, then priority (unset = medium); closed excluded');
  const hc = j.queue.cases[0];
  ok(hc.adapter === 'healthcare' && hc.exposure === 4850 && hc.sla.overdue === true && hc.actions.join() === 'reassign,escalate,priority', 'queue rows carry the common case shape and the actions this role may take');
  ok(j.queue.cases.find(c => c.caseId === 'gen-1').adapted === false, 'an unadapted vertical is flagged adapted:false');
  j = await (await get('/api/bpo/os/queue?vertical=insurance', 'manager')).json();
  ok(j.queue.total === 1 && j.queue.cases[0].caseId === 'ins-1', 'vertical filter');
  j = await (await get('/api/bpo/os/queue?owner=unassigned&state=all', 'manager')).json();
  ok(j.queue.cases.map(c => c.caseId).sort().join() === 'done-1,gen-1,ins-1', 'owner=unassigned with state=all');
  j = await (await get('/api/bpo/os/queue?clientId=c1', 'manager')).json();
  ok(j.queue.total === 2, 'clientId filter');
  r = await get('/api/bpo/os/queue?state=bogus', 'manager');
  ok(r.status === 400, 'bad state is 400');
  r = await get('/api/bpo/os/queue?priority=urgent', 'manager');
  ok(r.status === 400, 'bad priority filter is 400');
  j = await (await get('/api/bpo/os/summary', 'manager')).json();
  ok(j.summary.openCount === 4 && j.summary.openExposure === 16850 && j.summary.exposureUnknownCount === 2 && j.summary.overdue === 1 && j.summary.unassigned === 2, 'summary: counts, known exposure, unknown exposure, overdue, unassigned');
  j = await (await get('/api/bpo/os/cases/hc-1', 'analyst')).json();
  ok(j.ok && j.case.caseId === 'hc-1' && Array.isArray(j.audit) && j.audit.length === 0, 'case detail returns the case and its (empty) audit trail');
  r = await get('/api/bpo/os/cases/nope', 'analyst');
  ok(r.status === 404, 'unknown case is 404');

  // ── Actions: validation ──
  r = await act('hc-1', 'reassign', 'manager', { owner: 'bob', reason: 'cover' }, { Cookie: H.manager.Cookie });
  ok(r.status === 415, 'an action without a JSON content-type is 415');
  r = await act('hc-1', 'reassign', 'manager', { owner: 'bob' });
  ok(r.status === 400, 'no reason is 400');
  r = await act('hc-1', 'reassign', 'analyst', { owner: 'bob', reason: 'cover for Ann' });
  ok(r.status === 403, 'analyst cannot reassign (403)');
  r = await act('nope', 'reassign', 'manager', { owner: 'bob', reason: 'cover for Ann' });
  ok(r.status === 404, 'acting on an unknown case is 404');
  r = await act('done-1', 'reassign', 'admin', { owner: 'bob', reason: 'cover for Ann' });
  ok(r.status === 409, 'acting on a closed case is 409');
  r = await act('hc-1', 'reassign', 'manager', { owner: 'ann', reason: 'no change' });
  ok(r.status === 409, 'reassigning to the current owner is 409');
  ok(audits().length === 0, 'rejected actions write nothing to the audit trail');

  // ── Actions: happy paths ──
  const before = clone(byId('hc-1'));
  r = await act('hc-1', 'reassign', 'manager', { owner: 'Bob Smith', reason: 'Ann is out sick' });
  j = await r.json();
  ok(r.status === 200 && j.ok && j.case.owner === 'Bob Smith' && byId('hc-1').owner === 'Bob Smith', 'manager reassigns a case');
  ok(byId('hc-1').stage === before.stage && byId('hc-1').status === before.status && JSON.stringify(byId('hc-1').payload) === JSON.stringify(before.payload) && byId('hc-1').priority === before.priority, 'reassign touches only the owner (stage, status, payload, priority unchanged)');
  ok(getCollection('bpo_sla_events')._docs.length === 0, 'reassign writes no SLA "advanced" event (unlike bpoUpsertWorkItem)');
  ok(byId('hc-1').updatedAt !== before.updatedAt, 'updatedAt moves forward');
  let a = audits()[0];
  ok(audits().length === 1 && a.action === 'work_item.reassign' && a.actor === 'Maria' && a.entityId === 'hc-1' && a.detail.role === 'manager' && a.detail.from === 'ann' && a.detail.to === 'Bob Smith' && a.detail.reason === 'Ann is out sick' && a.detail.clientId === 'c1' && a.detail.vertical === 'healthcare', 'audit row records who, what, from -> to, why, role, client, vertical');

  r = await act('hc-1', 'escalate', 'analyst', { reason: 'payer deadline passed', escalatedTo: 'VP Revenue' });
  j = await r.json();
  ok(r.status === 200 && j.case.escalated === true && j.case.escalation.by === 'Ann' && j.case.escalation.to === 'VP Revenue' && j.case.escalation.count === 1, 'analyst escalates a case');
  ok(j.case.actions.join() === 'priority', 'after escalating, the analyst is left with priority only');
  r = await act('hc-1', 'escalate', 'manager', { reason: 'already escalated' });
  ok(r.status === 409, 'escalating twice is 409');
  r = await act('hc-1', 'de-escalate', 'analyst', { reason: 'not allowed to' });
  ok(r.status === 403, 'analyst cannot de-escalate (403)');
  r = await act('hc-1', 'de-escalate', 'manager', { reason: 'payer agreed to extension' });
  ok(r.status === 200 && byId('hc-1').escalated === false, 'manager de-escalates');
  ok(audits().map(x => x.action).join() === 'work_item.reassign,work_item.escalate,work_item.de_escalate', 'each action left exactly one audit row, in order');

  r = await act('hc-1', 'priority', 'analyst', { priority: 'critical', reason: 'deadline tomorrow' });
  ok(r.status === 200 && byId('hc-1').priority === 'critical', 'analyst raises priority');
  r = await act('hc-1', 'priority', 'analyst', { priority: 'low', reason: 'less urgent now' });
  ok(r.status === 403 && byId('hc-1').priority === 'critical', 'analyst cannot lower priority; nothing changed');
  r = await act('hc-1', 'priority', 'manager', { priority: 'low', reason: 'less urgent now' });
  ok(r.status === 200 && byId('hc-1').priority === 'low', 'manager lowers priority');
  r = await act('hc-1', 'priority', 'admin', { priority: 'bogus', reason: 'bad value here' });
  ok(r.status === 400, 'invalid priority is 400');

  // audit trail visible through the case endpoint, newest first
  j = await (await get('/api/bpo/os/cases/hc-1', 'manager')).json();
  ok(j.audit.length === 5 && j.audit[0].action === 'work_item.priority_change' && j.audit[0].detail.to === 'low' && j.audit[4].action === 'work_item.reassign', 'case detail shows its audit trail, newest first');

  // ── Failure handling ──
  const wi = getCollection('bpo_work_items');
  const auditCol = getCollection('bpo_audit_logs');
  const origInsert = auditCol.insertOne;
  const snapshot = clone(byId('ins-1'));
  auditCol.insertOne = async () => { throw new Error('audit store unavailable'); };
  r = await act('ins-1', 'reassign', 'manager', { owner: 'Zed', reason: 'audit will fail' });
  j = await r.json();
  auditCol.insertOne = origInsert;
  ok(r.status === 500 && /rolled back/.test(j.error), 'a failed audit write fails the request');
  ok(!byId('ins-1').owner && byId('ins-1').updatedAt === snapshot.updatedAt, 'and the change is rolled back (owner unassigned again, updatedAt restored)');
  const auditsBefore = audits().length;

  const origUpdate = wi.updateOne;
  wi.updateOne = async (q, u, o) => { if (q.caseId === 'ins-1') return { matchedCount: 0, modifiedCount: 0 }; return origUpdate(q, u, o); };
  r = await act('ins-1', 'priority', 'manager', { priority: 'critical', reason: 'concurrent edit' });
  wi.updateOne = origUpdate;
  ok(r.status === 409 && byId('ins-1').priority === 'high' && audits().length === auditsBefore, 'a concurrent change is a 409 and writes no audit row');

  wi.updateOne = async (q, u, o) => { if (q.caseId === 'ins-1') return { acknowledged: true }; return origUpdate(q, u, o); };
  r = await act('ins-1', 'priority', 'manager', { priority: 'critical', reason: 'driver reports no counts' });
  wi.updateOne = origUpdate;
  ok(r.status === 409 && byId('ins-1').priority === 'high' && audits().length === auditsBefore, 'a silent no-op write (driver reports no counts) is detected and is a 409');

  r = await act('ins-1', 'reassign', 'ghost', { owner: 'Zed', reason: 'deactivated user' });
  j = await r.json();
  ok(r.status === 403 && /inactive/i.test(j.error) && !byId('ins-1').owner, 'a deactivated staff account cannot write (403)');
  r = await get('/api/bpo/os/queue', 'ghost');
  ok(r.status === 200, 'but reads are unaffected (revocation gates writes)');

  // ── Ingest gate (Healthcare recovery handoff) ──
  const NULLCASE = { claimId: null, payer: null, denialCategory: 'coding', denialReasonCode: null, financialExposure: null, appealable: true };
  const handoff = sc => ({ vertical: 'healthcare', stage: 'ready-for-review', clientId: 'c1', payload: { sections: { healthcareRevenueRecovery: { structuredCase: sc } } } });
  const put = (id, who, body) => post('/api/bpo/work-items/' + encodeURIComponent(id), who, body);

  r = await put('new-bad', 'admin', handoff(NULLCASE));
  j = await r.json();
  ok(r.status === 422 && j.missing.includes('claim ID') && j.missing.includes('financial exposure') && !byId('new-bad'), 'an incomplete healthcare handoff is rejected (422) on create and nothing is stored');
  r = await put('new-good', 'admin', handoff(FULL_HC));
  ok(r.status === 200 && byId('new-good'), 'a complete healthcare handoff is accepted');
  work().push({ caseId: 'legacy-1', vertical: 'healthcare', clientId: 'c1', stage: 'ready-for-review', status: 'open', priority: 'medium', createdAt: stamp, updatedAt: stamp, payload: { sections: { healthcareRevenueRecovery: { structuredCase: NULLCASE } } } });
  r = await put('legacy-1', 'admin', Object.assign(handoff(NULLCASE), { stage: 'executed' }));
  ok(r.status === 200 && byId('legacy-1').stage === 'executed', 'an already-stored legacy item can still advance (the gate applies to create only)');
  r = await put('plain-1', 'admin', { vertical: 'bpo', stage: 'war-room', payload: { note: 'no handoff marker' } });
  ok(r.status === 200, 'payloads without the healthcare handoff are untouched by the gate');
  process.env.TSM_STRICT_INGEST = '0';
  r = await put('new-bad-2', 'admin', handoff(NULLCASE));
  ok(r.status === 200 && byId('new-bad-2'), 'TSM_STRICT_INGEST=0 switches the gate off');
  delete process.env.TSM_STRICT_INGEST;
  r = await put('new-bad-3', 'manager', handoff(NULLCASE));
  ok(r.status === 422, 'the gate applies to every internal role');

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
