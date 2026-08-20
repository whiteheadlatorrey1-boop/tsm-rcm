'use strict';

// Smoke test for memberPortfolioSummary() (server/tsm-ledger-service.js) —
// the all-member rollup backing GET /api/members/portfolio-summary and
// html/tsm-portfolio-command-center.html.
//
// Same fake-mongodb-driver pattern as
// scripts/test-bpo-upsert-priority-from-severity.js and
// scripts/test-bpo-document-extraction.js — a real mongodb-memory-server
// isn't reachable from this sandbox, so the 'mongodb' module is stubbed
// with an in-memory multi-collection store and injected into
// require.cache before requiring tsm-ledger-service.js. This exercises
// the real memberCreate -> bpoUpsertCase -> memberCaseSummary ->
// memberPortfolioSummary chain, not a mock of any of those functions.

const crypto = require('crypto');
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
        return { acknowledged: true, insertedId: doc.id || doc.caseId || `fake_${rows.length}` };
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
            results = results.slice().sort((a, b) => (a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0) * dir);
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
            const doc = { ...(update.$set || {}) };
            rows.push(doc);
            return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
          }
          return { matchedCount: 0, modifiedCount: 0 };
        }
        if (update.$set) Object.assign(rows[idx], update.$set);
        return { matchedCount: 1, modifiedCount: 1 };
      }
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
  process.env.TSM_DOC_ENCRYPTION_KEY = process.env.TSM_DOC_ENCRYPTION_KEY || crypto.randomBytes(32).toString('base64');

  delete require.cache[require.resolve('../server/tsm-ledger-service')];
  const ledger = require('../server/tsm-ledger-service');

  check('memberPortfolioSummary exported', typeof ledger.memberPortfolioSummary === 'function');

  console.log('\n1. Empty portfolio (no members)');
  const emptyPortfolio = await ledger.memberPortfolioSummary();
  check('totalMembers is 0', emptyPortfolio.totalMembers === 0);
  check('totalCases is 0', emptyPortfolio.totalCases === 0);
  check('topMembers is empty array', Array.isArray(emptyPortfolio.topMembers) && emptyPortfolio.topMembers.length === 0);

  console.log('\n2. Members with no tagged cases yet');
  const m1 = await ledger.memberCreate({ name: 'Apex Construction LLC' }, 'tester');
  const m2 = await ledger.memberCreate({ name: 'Sunrise Medical Billing LLC' }, 'tester');
  const m3 = await ledger.memberCreate({ name: 'Desert Mortgage Partners' }, 'tester');
  const noCasePortfolio = await ledger.memberPortfolioSummary();
  check('totalMembers is 3', noCasePortfolio.totalMembers === 3);
  check('totalCases is still 0 (no cases tagged)', noCasePortfolio.totalCases === 0);
  check('topMembers excludes zero-case members', noCasePortfolio.topMembers.length === 0);

  console.log('\n3. Tag cases across members/verticals, re-check aggregation');
  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await ledger.bpoUpsertCase('case_apex_1', {
    tenantId: m1.id, vertical: 'construction', status: 'OPEN', exposure: 420000,
    deadline: in3Days, detectedExceptions: [{ severity: 'HIGH' }],
  }, 'tester');
  await ledger.bpoUpsertCase('case_apex_2', {
    tenantId: m1.id, vertical: 'construction', status: 'OPEN', exposure: 18000,
    deadline: in30Days, detectedExceptions: [{ severity: 'CRITICAL' }],
  }, 'tester');
  await ledger.bpoUpsertCase('case_sunrise_1', {
    tenantId: m2.id, vertical: 'healthcare', status: 'OPEN', exposure: 640000,
    deadline: in3Days, detectedExceptions: [{ severity: 'critical' }], // lowercase, must still count
  }, 'tester');
  await ledger.bpoUpsertCase('case_sunrise_2', {
    tenantId: m2.id, vertical: 'healthcare', status: 'CLOSED', exposure: 5000,
    detectedExceptions: [{ severity: 'LOW' }],
  }, 'tester');
  await ledger.bpoUpsertCase('case_desert_1', {
    tenantId: m3.id, vertical: 'mortgage', status: 'OPEN',
    // deliberately no exposure figure -- must be excluded from the sum,
    // not counted as $0, and must flip isExposurePartial for this member
    // and for the portfolio.
    deadline: in30Days, detectedExceptions: [{ severity: 'MEDIUM' }],
  }, 'tester');

  const portfolio = await ledger.memberPortfolioSummary();
  check('totalMembers still 3', portfolio.totalMembers === 3);
  check('totalCases sums to 5', portfolio.totalCases === 5);
  check('exposureTotal sums only cases with a number (420000+18000+640000+5000)',
    portfolio.exposureTotal === 420000 + 18000 + 640000 + 5000);
  check('exposureCaseCount is 4 (case_desert_1 excluded)', portfolio.exposureCaseCount === 4);
  check('isExposurePartial is true (case_desert_1 has no exposure)', portfolio.isExposurePartial === true);
  check('slaAtRisk counts open cases due within 7d across all members (case_apex_1 + case_sunrise_1)',
    portfolio.slaAtRisk === 2);
  check('criticalCases counts CRITICAL and critical case-insensitively (case_apex_2 + case_sunrise_1)',
    portfolio.criticalCases === 2);
  check('byVertical aggregates counts across members (construction:2, healthcare:2, mortgage:1)',
    portfolio.byVertical.construction === 2 && portfolio.byVertical.healthcare === 2 && portfolio.byVertical.mortgage === 1);

  check('topMembers ranked by exposureTotal descending', portfolio.topMembers.length === 3 &&
    portfolio.topMembers[0].memberId === m2.id && // Sunrise: 645000
    portfolio.topMembers[1].memberId === m1.id && // Apex: 438000
    portfolio.topMembers[2].memberId === m3.id);  // Desert: 0 (partial)

  const sunriseEntry = portfolio.topMembers.find(m => m.memberId === m2.id);
  check('top member exposure figure correct', sunriseEntry.exposureTotal === 645000);
  check('top member topVertical correct', sunriseEntry.topVertical === 'healthcare');

  const desertEntry = portfolio.topMembers.find(m => m.memberId === m3.id);
  check('member with no exposure data still appears in topMembers (has cases, just $0 known)', !!desertEntry);
  check('that member is flagged isExposurePartial', desertEntry.isExposurePartial === true);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})().catch(err => {
  console.error('Harness crashed:', err);
  process.exit(1);
});
