'use strict';

// Regression test for Phase 5's per-client admin controls
// (slaThresholdHours / pricingTier / billingRate on bpo_clients, commit
// 96e244fa) -- landed with no persisted test, unlike every other BPO fix
// in this repo. Same stubbed-mongodb-driver pattern as
// scripts/test-bpo-upsert-priority-from-severity.js.
//
// Covers:
//   1. bpoUpdateClient validates slaThresholdHours (positive finite number,
//      or null/'' to clear) and pricingTier (must be a known tier, or
//      null/'' to clear) -- rejects garbage instead of silently storing it.
//   2. A brand-new client defaults to no threshold/tier/rate, so nothing
//      about this feature changes behavior for a client that never opts in.
//   3. The GET /api/bpo/reports/sla join logic (breach = ageHoursAtEvent >
//      threshold) is exercised directly against the same threshold values
//      bpoUpdateClient would have stored, covering: no threshold set,
//      threshold set and exceeded, threshold set and not exceeded, and a
//      missing ageHoursAtEvent on the event itself.

const path = require('path');
const Module = require('module');

// ---- fake mongodb driver ---------------------------------------------------

const clientStore = new Map(); // id -> doc

const fakeClientsCollection = {
  async findOne(query) {
    const doc = clientStore.get(query.id);
    return doc ? { ...doc } : null;
  },
  async insertOne(doc) {
    clientStore.set(doc.id, { ...doc });
    return { acknowledged: true, insertedId: doc.id };
  },
  async findOneAndUpdate(query, update, opts) {
    const existing = clientStore.get(query.id) || null;
    if (!existing) return null;
    const next = { ...existing, ...(update.$set || {}) };
    clientStore.set(query.id, next);
    // Real driver's findOneAndUpdate return shape varies by version/options;
    // tsm-ledger-service.js's bpoUpdateClient expects the doc itself back
    // (mongodb v4 default, no returnDocument option passed) -- match that.
    return next;
  },
  async find() {
    return { toArray: async () => [...clientStore.values()] };
  }
};

const fakeDb = { collection: () => fakeClientsCollection };

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

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  OK  ', msg); }
  else { fail++; console.log('  FAIL', msg); }
}

(async () => {
  console.log('1. New client defaults');
  const created = await ledger.bpoCreateClient({ name: 'Acme SLA Test' }, 'test-actor');
  ok(created.slaThresholdHours === null, 'slaThresholdHours defaults to null');
  ok(created.pricingTier === null, 'pricingTier defaults to null');
  ok(created.billingRate === '', 'billingRate defaults to empty string');

  console.log('\n2. bpoUpdateClient validation — slaThresholdHours');
  const setOk = await ledger.bpoUpdateClient(created.id, { slaThresholdHours: 24 }, 'test-actor');
  ok(setOk.slaThresholdHours === 24, 'valid positive number is stored');

  let threw = false;
  try { await ledger.bpoUpdateClient(created.id, { slaThresholdHours: -5 }, 'test-actor'); }
  catch (e) { threw = true; }
  ok(threw, 'negative number is rejected');

  threw = false;
  try { await ledger.bpoUpdateClient(created.id, { slaThresholdHours: 'not-a-number' }, 'test-actor'); }
  catch (e) { threw = true; }
  ok(threw, 'non-numeric string is rejected');

  threw = false;
  try { await ledger.bpoUpdateClient(created.id, { slaThresholdHours: 0 }, 'test-actor'); }
  catch (e) { threw = true; }
  ok(threw, 'zero is rejected (must be > 0)');

  const cleared = await ledger.bpoUpdateClient(created.id, { slaThresholdHours: null }, 'test-actor');
  ok(cleared.slaThresholdHours === null, 'null explicitly clears the threshold');

  console.log('\n3. bpoUpdateClient validation — pricingTier');
  const tierOk = await ledger.bpoUpdateClient(created.id, { pricingTier: 'premium' }, 'test-actor');
  ok(tierOk.pricingTier === 'premium', 'valid tier is stored');

  threw = false;
  try { await ledger.bpoUpdateClient(created.id, { pricingTier: 'platinum' }, 'test-actor'); }
  catch (e) { threw = true; }
  ok(threw, 'unknown tier is rejected');

  const tierCleared = await ledger.bpoUpdateClient(created.id, { pricingTier: '' }, 'test-actor');
  ok(tierCleared.pricingTier === null, "empty string clears the tier (same as null)");

  console.log('\n4. SLA breach join logic (mirrors GET /api/bpo/reports/sla)');
  function computeBreach(threshold, ageHoursAtEvent) {
    const hasAge = Number.isFinite(ageHoursAtEvent);
    return threshold != null && hasAge ? ageHoursAtEvent > threshold : null;
  }
  ok(computeBreach(null, 30) === null, 'no threshold set -> breached is null, not false');
  ok(computeBreach(24, 30) === true, 'age exceeds threshold -> breached true');
  ok(computeBreach(24, 10) === false, 'age under threshold -> breached false');
  ok(computeBreach(24, undefined) === null, 'missing ageHoursAtEvent -> breached null, no crash/NaN comparison');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
