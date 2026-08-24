'use strict';

// Regression/smoke test for Phase 4's client-facing report:
// bpoBuildClientRollup() and the monthly-snapshot pair
// (bpoSaveClientMonthlyReport / bpoListClientMonthlyReports /
// bpoGetClientMonthlyReport) in server/tsm-ledger-service.js.
//
// Same stubbed-mongodb-driver pattern as
// scripts/test-bpo-document-extraction.js (a real mongodb-memory-server
// isn't reachable from this sandbox).
//
// Covers:
//   1. bpoBuildClientRollup() only counts the target client's own work
//      items (a second client's data must not leak into the rollup or
//      the case-level summary list).
//   2. The case-level summary excludes internal-only fields
//      (owner, payload) that have no reason to reach a client.
//   3. bpoSaveClientMonthlyReport() upserts on (clientId, periodLabel)
//      -- saving twice for the same period replaces, not duplicates.
//   4. bpoGetClientMonthlyReport()/bpoListClientMonthlyReports() read
//      back what was saved, scoped correctly by clientId.

const path = require('path');
const Module = require('module');

let passed = 0;
let failed = 0;
function check(label, cond) {
  if (cond) { console.log(`  OK   ${label}`); passed++; }
  else { console.log(`  FAIL ${label}`); failed++; }
}

(async () => {
  const collections = new Map();
  function collectionFor(name) {
    if (!collections.has(name)) collections.set(name, []);
    const rows = collections.get(name);
    function matches(doc, query) {
      return Object.keys(query || {}).every(key => doc[key] === query[key]);
    }
    return {
      async insertOne(doc) {
        rows.push({ ...doc });
        return { acknowledged: true, insertedId: `fake_${rows.length}` };
      },
      async findOne(query) {
        const found = rows.find(d => matches(d, query));
        return found ? { ...found } : null;
      },
      find(query) {
        let results = rows.filter(d => matches(d, query)).map(d => ({ ...d }));
        const cursor = {
          sort(spec) {
            const [[field, dir]] = Object.entries(spec);
            results = results.slice().sort((a, b) => (a[field] > b[field] ? 1 : -1) * dir);
            return cursor;
          },
          limit(n) { results = results.slice(0, n); return cursor; },
          async toArray() { return results; }
        };
        return cursor;
      },
      async updateOne(query, update, opts) {
        const idx = rows.findIndex(d => matches(d, query));
        if (idx === -1) {
          if (opts && opts.upsert) {
            const doc = { ...query };
            if (update.$set) Object.assign(doc, update.$set);
            rows.push(doc);
            return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
          }
          return { matchedCount: 0, modifiedCount: 0 };
        }
        if (update.$set) Object.assign(rows[idx], update.$set);
        return { matchedCount: 1, modifiedCount: 1 };
      },
    };
  }

  const fakeDb = { collection: (name) => collectionFor(name) };
  class FakeMongoClient {
    async connect() { return this; }
    db() { return fakeDb; }
  }

  const mongodbResolvedPath = require.resolve('mongodb');
  const fakeMongodbModule = new Module(mongodbResolvedPath, null);
  fakeMongodbModule.exports = { MongoClient: FakeMongoClient };
  fakeMongodbModule.loaded = true;
  require.cache[mongodbResolvedPath] = fakeMongodbModule;

  process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://fake-host/tsm-consultz-test';

  delete require.cache[require.resolve('../server/tsm-ledger-service')];
  const ledger = require('../server/tsm-ledger-service');

  console.log('Setup: seed 2 clients, work items for each, an SLA event for the target client');
  await ledger.bpoUpsertWorkItem('case-A1', {
    clientId: 'acme-co', vertical: 'bpo', stage: 'war-room', status: 'open',
    owner: 'jsmith', priority: 'high', payload: { extraction: { severity: 'HIGH' } },
  }, 'test-actor');
  await ledger.bpoUpsertWorkItem('case-A2', {
    clientId: 'acme-co', vertical: 'bpo', stage: 'strategist', status: 'resolved',
    owner: 'jsmith', priority: 'low',
  }, 'test-actor');
  await ledger.bpoUpsertWorkItem('case-B1', {
    clientId: 'other-co', vertical: 'bpo', stage: 'war-room', status: 'open',
    owner: 'other-staff', priority: 'critical',
  }, 'test-actor');

  console.log('\n1. bpoBuildClientRollup() scopes correctly to one client');
  const rollup = await ledger.bpoBuildClientRollup('acme-co');
  check('rollup.clientId matches', rollup.clientId === 'acme-co');
  check('totalWorkItems is 2 (not 3 -- other-co excluded)', rollup.totalWorkItems === 2);
  check('cases list has exactly 2 entries', rollup.cases.length === 2);
  check('cases list has no other-co caseId', !rollup.cases.some(c => c.caseId === 'case-B1'));

  console.log('\n2. Case-level summary excludes internal-only fields');
  check('case entries have no owner field', rollup.cases.every(c => !('owner' in c)));
  check('case entries have no payload field', rollup.cases.every(c => !('payload' in c)));
  check('case entries do have caseId/stage/status/priority', rollup.cases.every(c => c.caseId && c.stage && c.status && c.priority));

  console.log('\n3. bpoSaveClientMonthlyReport() upserts on (clientId, periodLabel), not duplicates');
  const saved1 = await ledger.bpoSaveClientMonthlyReport('acme-co', rollup, '2026-08');
  check('first save has periodLabel 2026-08', saved1.periodLabel === '2026-08');
  const rollup2 = await ledger.bpoBuildClientRollup('acme-co'); // re-fetch (avgOpenAgeHours will differ slightly, that's fine)
  const saved2 = await ledger.bpoSaveClientMonthlyReport('acme-co', rollup2, '2026-08');
  check('second save for same period succeeds', saved2.periodLabel === '2026-08');
  const allForPeriod = await ledger.bpoListClientMonthlyReports({ clientId: 'acme-co' });
  check('exactly 1 stored report for acme-co (upsert, not duplicate)', allForPeriod.length === 1);

  console.log('\n4. Read-back is scoped correctly by clientId and period');
  await ledger.bpoSaveClientMonthlyReport('other-co', await ledger.bpoBuildClientRollup('other-co'), '2026-08');
  const acmeOnly = await ledger.bpoListClientMonthlyReports({ clientId: 'acme-co' });
  check('acme-co listing does not include other-co', acmeOnly.every(r => r.clientId === 'acme-co'));
  const byPeriod = await ledger.bpoGetClientMonthlyReport('acme-co', '2026-08');
  check('bpoGetClientMonthlyReport finds the right doc', byPeriod && byPeriod.clientId === 'acme-co' && byPeriod.periodLabel === '2026-08');
  const missingPeriod = await ledger.bpoGetClientMonthlyReport('acme-co', '1999-01');
  check('bpoGetClientMonthlyReport returns null for a period never generated', missingPeriod === null);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
