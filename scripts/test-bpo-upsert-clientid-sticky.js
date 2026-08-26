'use strict';

// Smoke test for the sticky-clientId fix in bpoUpsertWorkItem
// (server/tsm-ledger-service.js).
//
// Before this fix, clientId defaulted to null on every upsert call that
// didn't explicitly pass it -- unlike owner/priority/dueDate/payload,
// which were already sticky. The exec-portal's markExecuted() (real code,
// html/war-rooms/bpo-war/bpo-executive-portal.html) POSTs {vertical, stage:
// 'exec', status: 'resolved', payload} with NO clientId field, so on every
// real "mark this case executed" action, the case's clientId was silently
// wiped -- at the exact moment the case is supposed to show up as closed
// in that client's rollup (GET /api/bpo/reports/client-rollup ->
// bpoBuildClientRollup(), which filters strictly on clientId equality).
//
// Same sandbox constraint as test-bpo-upsert-priority-from-severity.js: no
// real MongoDB reachable here (mongod binary download and
// mongodb-memory-server's fastdl.mongodb.org fetch are both outside the
// network allowlist), so this stubs the 'mongodb' driver module with an
// in-memory fake collection and injects it into require.cache before
// requiring tsm-ledger-service.js. The business logic under test
// (bpoUpsertWorkItem, bpoBuildClientRollup) is the real, unmodified code.

const Module = require('module');

// ---- fake mongodb driver -------------------------------------------------

const store = new Map(); // caseId -> doc

function applyUpdate(existing, update) {
  const doc = existing ? { ...existing } : {};
  if (update.$set) Object.assign(doc, update.$set);
  if (update.$setOnInsert && !existing) Object.assign(doc, update.$setOnInsert);
  return doc;
}

const fakeCollection = {
  async findOne(query) {
    if (query.clientId !== undefined) {
      const doc = [...store.values()].find(d => d.caseId === query.caseId && d.clientId === query.clientId);
      return doc ? { ...doc } : null;
    }
    const doc = store.get(query.caseId);
    return doc ? { ...doc } : null;
  },
  find(query = {}) {
    let results = [...store.values()].filter(d =>
      (query.clientId === undefined || d.clientId === query.clientId) &&
      (query.stage === undefined || d.stage === query.stage)
    ).map(d => ({ ...d }));
    const api = {
      sort() { return api; },
      limit(n) { results = results.slice(0, n); return api; },
      async toArray() { return results; },
    };
    return api;
  },
  async updateOne(query, update, opts) {
    const existing = store.get(query.caseId) || null;
    if (!existing && !(opts && opts.upsert)) {
      return { matchedCount: 0, modifiedCount: 0 };
    }
    const next = applyUpdate(existing, update);
    store.set(query.caseId, next);
    return {
      matchedCount: existing ? 1 : 0,
      modifiedCount: existing ? 1 : 0,
      upsertedCount: existing ? 0 : 1
    };
  },
  async insertOne() {
    return { acknowledged: true, insertedId: 'fake-id' };
  }
};

const fakeDb = { collection: () => fakeCollection };

class FakeMongoClient {
  constructor() {}
  async connect() { return this; }
  db() { return fakeDb; }
}

const mongodbResolvedPath = require.resolve('mongodb');
const fakeMongodbModule = new Module(mongodbResolvedPath, null);
fakeMongodbModule.exports = { MongoClient: FakeMongoClient };
fakeMongodbModule.loaded = true;
require.cache[mongodbResolvedPath] = fakeMongodbModule;

process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://fake-host/tsm-consultz-test';

const ledger = require('../server/tsm-ledger-service');

// ---- assertions -----------------------------------------------------------

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('OK:', msg);
  }
}

(async () => {
  // 1. War room creates the case with a real clientId (matches the shape
  //    a client-selector-equipped war-room UI, or a direct admin API call,
  //    would send).
  const created = await ledger.bpoUpsertWorkItem('BPO-CID-1', {
    clientId: 'acme-co',
    vertical: 'bpo',
    stage: 'war-room',
    status: 'open',
    payload: { selectedSector: 'BPO' }
  }, 'test-actor');

  assert(created && created.clientId === 'acme-co',
    `first upsert stores the given clientId - got ${created && created.clientId}`);

  // 2. Strategist-stage upsert, real code never sends clientId here either
  //    -> must stay sticky, not reset to null.
  const strategist = await ledger.bpoUpsertWorkItem('BPO-CID-1', {
    vertical: 'bpo',
    stage: 'strategist',
    status: 'open',
    payload: { selectedSector: 'BPO' }
  }, 'test-actor');

  assert(strategist && strategist.clientId === 'acme-co',
    `clientId stays sticky across a clientId-less strategist-stage upsert - got ${strategist && strategist.clientId}`);

  // 3. Exec-portal markExecuted() upsert -- the real bug trigger. Real
  //    code sends {vertical, stage:'exec', status:'resolved', payload}
  //    with no clientId field at all.
  const executed = await ledger.bpoUpsertWorkItem('BPO-CID-1', {
    vertical: 'bpo',
    stage: 'exec',
    status: 'resolved',
    payload: { selectedSector: 'BPO' }
  }, 'test-actor');

  assert(executed && executed.clientId === 'acme-co',
    `clientId survives markExecuted()'s clientId-less upsert - got ${executed && executed.clientId}`);

  // 4. The case must still be visible in that client's rollup after being
  //    marked executed -- this is the actual user-facing behavior the bug
  //    broke (Stage 5 of the BPO chain: what the client sees).
  const rollup = await ledger.bpoBuildClientRollup('acme-co');
  const found = rollup.cases.find(c => c.caseId === 'BPO-CID-1');

  assert(!!found, 'the executed case is present in its client\'s rollup');
  assert(found && found.status === 'resolved' && found.stage === 'exec',
    `rollup entry reflects the resolved/exec state - got status=${found && found.status} stage=${found && found.stage}`);

  // 5. Explicit clientId re-link still works (e.g. an admin correcting a
  //    mis-filed case) -- the fix must not make clientId immutable, only
  //    sticky when omitted.
  const relinked = await ledger.bpoUpsertWorkItem('BPO-CID-1', {
    clientId: 'other-co'
  }, 'admin-actor');

  assert(relinked && relinked.clientId === 'other-co',
    `an explicit clientId still overrides the sticky value - got ${relinked && relinked.clientId}`);

  // 6. A case created with genuinely no clientId (e.g. an internal-only
  //    SOP doc, never meant to reach a client) stays null, not some
  //    stringified 'null' or accidentally-inherited value.
  const noClient = await ledger.bpoUpsertWorkItem('BPO-CID-2', {
    vertical: 'bpo',
    stage: 'war-room',
    payload: {}
  }, 'test-actor');

  assert(noClient && noClient.clientId === null,
    `a case created with no clientId at all stays null - got ${noClient && noClient.clientId}`);

  console.log('\n' + (process.exitCode ? 'SMOKE TEST FAILED' : 'SMOKE TEST PASSED'));
})().catch(err => {
  console.error('ERROR', err);
  process.exit(1);
});
