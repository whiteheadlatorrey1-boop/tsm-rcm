'use strict';

// Smoke test for commit b9de1d90 (fix(bpo): derive priority from extraction
// severity on first upsert) plus the sticky-priority contract that ships
// alongside it in bpoUpsertWorkItem (server/tsm-ledger-service.js).
//
// A real mongodb-memory-server round trip isn't possible in this sandbox --
// its mongod binary download hits fastdl.mongodb.org, which isn't in the
// network allowlist here (same wall as the puppeteer chrome download). So
// this stubs the 'mongodb' driver module itself with an in-memory fake
// collection that implements exactly the two calls bpoUpsertWorkItem makes
// (findOne, updateOne) plus $set/$setOnInsert semantics, and injects it into
// require.cache at mongodb's resolved path *before* requiring
// tsm-ledger-service.js. This exercises the real, unmodified
// bpoUpsertWorkItem logic end-to-end (including its own findOne-after-write
// re-read), not a mock of that function itself -- only the driver underneath
// it is fake. Closest thing to a DB-backed test available in this sandbox.

const path = require('path');
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
    const doc = store.get(query.caseId);
    return doc ? { ...doc } : null;
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
  // bpoUpsertWorkItem also fires an audit-log write and an SLA-event write
  // as side effects (audit trail / SLA tracking collections, not the work
  // items collection under test). Both are non-critical and fail soft in
  // the real code, but stub them so the smoke test doesn't spam stderr
  // with expected-but-irrelevant "not a function" warnings on every run.
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
  // 1. First creation, no explicit priority, payload carries a CRITICAL
  //    extraction severity -> priority must derive from severity, not
  //    silently default to 'medium'.
  const created = await ledger.bpoUpsertWorkItem('BPO-SEV-1', {
    clientId: 'test-client',
    vertical: 'healthcare',
    stage: 'war-room',
    payload: { extraction: { severity: 'CRITICAL', foo: 'bar' } }
  }, 'test-actor');

  assert(created && created.priority === 'critical',
    `first upsert derives priority from CRITICAL severity - got ${created && created.priority}`);

  // 2. Second upsert on the SAME case, no priority field passed, payload
  //    now omitted -> priority must stay sticky at 'critical', not reset
  //    to 'medium', and the original payload must be preserved (also
  //    covers the acadf4e4 sticky-payload fix along the way).
  const resynced = await ledger.bpoUpsertWorkItem('BPO-SEV-1', {
    clientId: 'test-client',
    vertical: 'healthcare',
    stage: 'triage',
    status: 'in-progress'
  }, 'test-actor');

  assert(resynced && resynced.priority === 'critical',
    `priority stays sticky across a priority-less resync - got ${resynced && resynced.priority}`);
  assert(resynced && resynced.payload && resynced.payload.extraction && resynced.payload.extraction.severity === 'CRITICAL',
    'payload stays sticky (extraction data not wiped) across the same resync');

  // 3. Explicit priority passed on a later call -> human override wins,
  //    even though extraction severity is still CRITICAL underneath.
  const overridden = await ledger.bpoUpsertWorkItem('BPO-SEV-1', {
    priority: 'low'
  }, 'human-actor');

  assert(overridden && overridden.priority === 'low',
    `explicit priority override wins over stored severity - got ${overridden && overridden.priority}`);

  // 4. Fresh case, no severity anywhere in payload, no explicit priority
  //    -> falls back to 'medium' (the pre-existing default), confirming
  //    the fix didn't remove that fallback for cases with no severity data.
  const noSeverity = await ledger.bpoUpsertWorkItem('BPO-SEV-2', {
    clientId: 'test-client',
    vertical: 'healthcare',
    payload: { extraction: {} }
  }, 'test-actor');

  assert(noSeverity && noSeverity.priority === 'medium',
    `first upsert with no severity data falls back to 'medium' - got ${noSeverity && noSeverity.priority}`);

  console.log('\n' + (process.exitCode ? 'SMOKE TEST FAILED' : 'SMOKE TEST PASSED'));
})().catch(err => {
  console.error('ERROR', err);
  process.exit(1);
});
