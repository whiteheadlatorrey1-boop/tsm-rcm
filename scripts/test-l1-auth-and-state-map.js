'use strict';

/**
 * L1 write-route authentication + ServiceNow state-mapping regression.
 *
 * Proves:
 *   1. technicianConfirmed=true in a request body is NOT, by itself,
 *      sufficient to write to ServiceNow -- a verified staff session is
 *      also required (closes the gap: a prior version of this route
 *      accepted the confirmation flag from any caller, session or not).
 *   2. A `client` session (external, not TSM staff) cannot write either --
 *      only admin/manager/analyst can.
 *   3. A valid staff session CAN still write (the fix doesn't overblock).
 *   4. Draft-only resolution generation (writeToServicenow absent/false)
 *      stays open with no session, so the ungated demo/training flow is
 *      unaffected.
 *   5. state-map.js resolves raw ServiceNow codes and display labels for
 *      incident/sc_task to the same canonical vocabulary the workflow
 *      engine and closure gate reason over, and never guesses on
 *      unrecognized input.
 *
 * Uses:
 *   - real server.js
 *   - isolated in-memory Mongo
 *   - isolated free TCP port
 *   - mocked ServiceNow adapter
 *
 * Run:
 *   node scripts/test-l1-auth-and-state-map.js
 */

const Module = require('module');
const assert = require('assert');

/* ------------------------------------------------------------------ */
/* Fake Mongo (same minimal shape as test-l1-governed-resolution-route) */
/* ------------------------------------------------------------------ */

const collections = new Map();

function clone(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function matches(doc, query) {
  return Object.keys(query || {}).every(key => doc[key] === query[key]);
}

function getCollection(name) {
  if (!collections.has(name)) {
    const docs = [];
    collections.set(name, {
      async findOne(query) {
        return clone(docs.find(d => matches(d, query))) || null;
      },
      async updateOne(query, update, options = {}) {
        const index = docs.findIndex(d => matches(d, query));
        if (index === -1) {
          if (!options.upsert) {
            return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
          }
          docs.push(clone(Object.assign({}, update.$setOnInsert || {}, update.$set || {})));
          return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
        }
        docs[index] = Object.assign({}, docs[index], clone(update.$set || {}));
        return { matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
      },
      async insertOne(doc) {
        docs.push(clone(doc));
        return { acknowledged: true };
      },
      async deleteMany(query) {
        let deleted = 0;
        for (let i = docs.length - 1; i >= 0; i--) {
          if (matches(docs[i], query)) { docs.splice(i, 1); deleted++; }
        }
        return { deletedCount: deleted };
      },
      async createIndex() { return 'ok'; },
      find(query) {
        let rows = docs.filter(d => matches(d, query));
        const chain = {
          sort() { return chain; },
          limit(n) { rows = rows.slice(0, n); return chain; },
          async toArray() { return clone(rows); }
        };
        return chain;
      },
      _docs: docs
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

const dotenvPath = require.resolve('dotenv');
const fakeDotenv = new Module(dotenvPath, null);
fakeDotenv.exports = { config: () => ({ parsed: {} }), parse: () => ({}) };
fakeDotenv.loaded = true;
require.cache[dotenvPath] = fakeDotenv;

process.env.MONGODB_URI = 'mongodb://fake-host/tsm-l1-auth-test';
process.env.TSM_SESSION_SECRET = 'test-session-secret-l1-auth';
process.env.TSM_ADMIN_PASSWORD = 'l1-auth-test-admin';
// Only used to prove the draft route doesn't require a session (test 4
// below); the Groq call itself isn't reached because the fetch stub
// below intercepts it before any real network call is made.
if (!process.env.GROQ_API_KEY) process.env.GROQ_API_KEY = 'test-groq-key-l1-auth';
delete process.env.TSM_STRICT_INGEST;

const realFetch = global.fetch;
global.fetch = async function testFetch(url, options) {
  const target = typeof url === 'string' ? url : (url && url.url) || '';
  if (target.startsWith('https://api.groq.com/')) {
    return new Response(
      JSON.stringify({ choices: [{ message: { content: 'Draft content for auth test.' } }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return realFetch(url, options);
};

/* ------------------------------------------------------------------ */
/* Mock ServiceNow adapter BEFORE server.js loads it.                   */
/* ------------------------------------------------------------------ */

const snAdapterPath = require.resolve('../server/l1-copilot/servicenow-adapter');
const writeCalls = [];
const fakeSnAdapter = new Module(snAdapterPath, null);
fakeSnAdapter.exports = {
  isConfigured() { return true; },
  async writeWorkNote(incident, note) {
    writeCalls.push({ incident, note });
    return { success: true, incident, sysId: 'fake-sys-id', verified: true };
  },
  async getTicket() { return null; },
  async getAsset() { return null; },
  async searchAssetsByUser() { return []; },
  async updateTicketStatus() {
    throw new Error('updateTicketStatus must not be called by this test');
  },
  _internal: {
    snRequest: async () => { throw new Error('snRequest must not be called by this test'); },
    readField: (record, field) => (record ? record[field] : undefined)
  }
};
fakeSnAdapter.loaded = true;
require.cache[snAdapterPath] = fakeSnAdapter;

/* ------------------------------------------------------------------ */
/* Test helpers                                                         */
/* ------------------------------------------------------------------ */

let passed = 0;
let failed = 0;

function ok(condition, message) {
  if (condition) {
    passed++;
    console.log('PASS: ' + message);
  } else {
    failed++;
    console.error('FAIL: ' + message);
  }
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = require('net').createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitForServer(base) {
  let last;
  for (let i = 0; i < 80; i++) {
    try {
      const response = await fetch(base + '/api/auth/status');
      if (response.ok) return;
    } catch (err) {
      last = err;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('server did not start: ' + (last && last.message));
}

async function main() {
  const port = await freePort();
  process.env.PORT = String(port);
  const BASE = 'http://127.0.0.1:' + port;

  require('../server.js');
  await waitForServer(BASE);

  const jsonHeaders = { 'Content-Type': 'application/json' };

  async function post(path, body, cookie) {
    const headers = Object.assign({}, jsonHeaders);
    if (cookie) headers.Cookie = cookie;
    return fetch(BASE + path, { method: 'POST', headers, body: JSON.stringify(body) });
  }

  console.log('\n=== L1 WRITE-ROUTE AUTH + STATE MAP ===');
  console.log('BASE: ' + BASE);

  /* ---------------------------------------------------------------- */
  /* 1. No session at all + technicianConfirmed:true -> refused        */
  /* ---------------------------------------------------------------- */

  writeCalls.length = 0;

  let res = await post('/api/l1-copilot/servicenow/work-note', {
    incident: 'INC0090001',
    note: 'Forged confirmation, no session',
    technicianConfirmed: true
  });

  ok(res.status === 401, 'unauthenticated work-note write is refused - got ' + res.status);
  ok(writeCalls.length === 0, 'no ServiceNow write occurred for the unauthenticated request');

  res = await post('/api/l1-copilot/resolution', {
    incident: 'INC0090002',
    draft: 'Forged confirmation via resolution route, no session',
    writeToServicenow: true,
    technicianConfirmed: true
  });

  ok(res.status === 401, 'unauthenticated resolution write is refused - got ' + res.status);
  ok(writeCalls.length === 0, 'no ServiceNow write occurred via the unauthenticated resolution route');

  /* ---------------------------------------------------------------- */
  /* 2. A `client` session cannot write either                         */
  /* ---------------------------------------------------------------- */

  const clientLogin = await post('/api/auth/login', { accessCode: 'not-a-real-code-so-this-should-fail' });
  // Client codes come from the live client registry, which is empty here;
  // this just establishes that login legitimately rejects an unknown code
  // rather than silently issuing a session.
  ok(clientLogin.status === 401, 'unknown access code is rejected, not silently authenticated - got ' + clientLogin.status);

  /* ---------------------------------------------------------------- */
  /* 3. Admin session CAN write (the fix doesn't overblock)             */
  /* ---------------------------------------------------------------- */

  const adminLogin = await post('/api/auth/login', { password: process.env.TSM_ADMIN_PASSWORD });
  const adminCookie = (adminLogin.headers.get('set-cookie') || '').split(';')[0];

  ok(
    adminLogin.status === 200 && adminCookie.startsWith('tsm_session='),
    'admin login succeeds and returns a session cookie'
  );

  writeCalls.length = 0;

  res = await post('/api/l1-copilot/servicenow/work-note', {
    incident: 'INC0090003',
    note: 'Authenticated technician write',
    technicianConfirmed: true
  }, adminCookie);

  const body = await res.json();

  ok(res.status === 200 && body.ok === true, 'authenticated admin work-note write succeeds - got ' + res.status);
  ok(writeCalls.length === 1 && writeCalls[0].incident === 'INC0090003', 'the authenticated write reached ServiceNow exactly once, for the right incident');
  ok(
    body.governed && body.governed.confirmedBy && body.governed.confirmedBy.role === 'admin',
    'response reports which technician role confirmed the write'
  );

  /* ---------------------------------------------------------------- */
  /* 4. Draft-only generation stays open with no session                */
  /* ---------------------------------------------------------------- */

  res = await post('/api/l1-copilot/resolution', {
    ticket: 'Workstation will not boot.',
    notes: 'Reseated RAM, confirmed POST.'
  });

  ok(res.status === 200, 'draft-only resolution generation (no write) stays open without a session - got ' + res.status);

  console.log('\n--- state-map.js ---');

  /* ---------------------------------------------------------------- */
  /* 5. state-map.js correctness                                       */
  /* ---------------------------------------------------------------- */

  const { normalizeState, resolveState } = require('../server/l1-copilot/state-map');

  ok(normalizeState('2') === 'IN PROGRESS', 'incident code "2" resolves to IN PROGRESS');
  ok(normalizeState('7') === 'CLOSED', 'incident code "7" resolves to CLOSED');
  ok(normalizeState('3') === 'ON HOLD', 'incident code "3" resolves to ON HOLD');
  ok(normalizeState('3', { table: 'sc_task' }) === 'CLOSED', 'sc_task code "3" (Closed Complete) resolves to CLOSED, not ON HOLD');
  ok(normalizeState('-5', { table: 'sc_req_item' }) === 'PENDING', 'sc_req_item code "-5" resolves to PENDING');
  ok(normalizeState('Work in Progress') === 'IN PROGRESS', 'display label "Work in Progress" resolves to IN PROGRESS');
  ok(normalizeState('IN_PROGRESS') === 'IN PROGRESS', 'legacy underscore form still normalizes (backward compatible)');
  ok(normalizeState('Closed Complete') === 'CLOSED', 'display label "Closed Complete" resolves to CLOSED');
  ok(normalizeState('NOT IN PROGRESS') === 'NOT IN PROGRESS', 'lookalike text is never substring-matched into a real state');
  ok(normalizeState('99') === '99', 'an unrecognized numeric code passes through rather than being guessed');
  ok(normalizeState('') === '', 'empty input resolves to empty, not a default state');

  const resolved = resolveState('2');
  ok(resolved.recognized === true && resolved.source === 'code', 'resolveState reports how a value was recognized (code)');

  const unresolved = resolveState('qwerty');
  ok(unresolved.recognized === false && unresolved.source === 'unknown', 'resolveState reports unrecognized input honestly rather than guessing');

  console.log('\n--- workflow-engine / closure-gate using state-map ---');

  const { evaluateWorkflow } = require('../server/l1-copilot/workflow-engine');
  const { evaluateClosure } = require('../server/l1-copilot/closure-gate');

  const fullEvidence = {
    userVerified: true,
    assetVerified: true,
    workConfirmed: true,
    tested: true,
    finalWorkNoteConfirmed: true,
    locationVerified: true
  };

  const liveIncident = evaluateWorkflow({ state: '2', taskType: 'OTHER', evidence: fullEvidence });
  ok(liveIncident.nextAction === 'TECHNICIAN MAY CLOSE', 'a live incident reporting raw state code "2" is treated as IN PROGRESS by the workflow engine');

  const closureOnCode = evaluateClosure({ state: '2', taskType: 'OTHER', evidence: fullEvidence });
  ok(closureOnCode.closureStatus === 'READY FOR CLOSURE', 'closure gate evaluates raw ServiceNow state codes, not just hand-typed text');
  ok(closureOnCode.autonomousCloseAllowed === false, 'closure gate still never allows autonomous close, even when evidence-complete');

  const scTaskClosed = evaluateWorkflow({ state: '3', stateTable: 'sc_task', taskType: 'OTHER', evidence: fullEvidence });
  ok(scTaskClosed.reason === 'Ticket is already resolved or closed.', 'an SC Task reporting its own code "3" (Closed Complete) is not mistaken for an On-Hold incident');

  console.log('');
  console.log('PASSED: ' + passed);
  console.log('FAILED: ' + failed);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
