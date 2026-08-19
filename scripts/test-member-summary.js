// Functional harness for the SMB Member layer (memberList/memberGet/
// memberCreate/memberCaseSummary) in server/tsm-ledger-service.js.
//
// No real MongoDB reachable in this sandbox, so this fakes the 'mongodb'
// module in-process with a minimal in-memory collection (find/findOne/
// insertOne/sort/limit/toArray -- just what tsm-ledger-service.js's
// member + bpoListCases functions actually call) and injects it via
// Module._cache before requiring the real ledger service. Everything
// downstream of that require is the REAL, unmodified member-layer code
// -- this only replaces the Mongo driver underneath it.
//
// Run from repo root: node scripts/test-member-summary.js

const Module = require('module');
const path = require('path');

// ---- fake in-memory Mongo ------------------------------------------------
function matches(doc, query) {
  return Object.keys(query || {}).every((k) => doc[k] === query[k]);
}

class FakeCollection {
  constructor() { this.docs = []; }
  async insertOne(doc) { this.docs.push(doc); return { insertedId: doc.id || String(this.docs.length) }; }
  async findOne(query) { return this.docs.find((d) => matches(d, query)) || null; }
  find(query) {
    const results = this.docs.filter((d) => matches(d, query));
    const chain = {
      _results: results,
      sort(spec) {
        const [field, dir] = Object.entries(spec || {})[0] || [null, 1];
        if (field) {
          this._results = this._results.slice().sort((a, b) => {
            if (a[field] < b[field]) return -1 * dir;
            if (a[field] > b[field]) return 1 * dir;
            return 0;
          });
        }
        return this;
      },
      limit(n) { this._results = this._results.slice(0, n); return this; },
      async toArray() { return this._results; },
    };
    return chain;
  }
}

class FakeDb {
  constructor() { this.collections = {}; }
  collection(name) {
    if (!this.collections[name]) this.collections[name] = new FakeCollection();
    return this.collections[name];
  }
}

class FakeMongoClient {
  constructor() { this._db = new FakeDb(); }
  async connect() { return this; }
  db() { return this._db; }
}

// node_modules isn't installed in this sandbox, so 'mongodb' can't be
// require.resolve()'d normally -- register the fake directly under the
// module id tsm-ledger-service.js will ask for ('mongodb') by patching
// Module._resolveFilename for just that one specifier.
const fakeMongoModule = { MongoClient: FakeMongoClient };
const FAKE_MONGODB_ID = '__fake_mongodb__';
require.cache[FAKE_MONGODB_ID] = {
  id: FAKE_MONGODB_ID,
  filename: FAKE_MONGODB_ID,
  loaded: true,
  exports: fakeMongoModule,
};
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === 'mongodb') return FAKE_MONGODB_ID;
  return originalResolveFilename.call(this, request, ...rest);
};

process.env.MONGODB_URI = 'mongodb://fake-for-test/tsm-consultz';

const ledger = require(path.join(__dirname, '..', 'server', 'tsm-ledger-service.js'));

let passed = 0;
let failed = 0;
function check(label, cond) {
  if (cond) { passed++; console.log(`  PASS: ${label}`); }
  else { failed++; console.error(`  FAIL: ${label}`); }
}

async function main() {
  // 1. memberCreate + slug de-dupe
  const m1 = await ledger.memberCreate({ name: 'Acme Multi-Vertical', verticals: ['construction', 'healthcare'] }, 'test-actor');
  check('memberCreate returns id slugified from name', m1.id === 'acme-multi-vertical');
  check('memberCreate defaults status to active', m1.status === 'active');

  const m1dup = await ledger.memberCreate({ name: 'Acme Multi-Vertical' }, 'test-actor');
  check('memberCreate de-dupes colliding slug with -2 suffix', m1dup.id === 'acme-multi-vertical-2');

  const m2 = await ledger.memberCreate({ name: 'Second Member Co' }, 'test-actor');

  // 2. memberList / memberGet
  const list = await ledger.memberList();
  check('memberList returns all created members', list.length === 3);
  const fetched = await ledger.memberGet(m1.id);
  check('memberGet returns the right member by id', fetched && fetched.name === 'Acme Multi-Vertical');
  const missing = await ledger.memberGet('does-not-exist');
  check('memberGet returns null for unknown id', missing === null);

  // 3. Seed bpo_cases directly (same collection bpoListCases/bpoUpsertCase
  // use) to test memberCaseSummary's aggregation against known data.
  const now = Date.now();
  const soon = new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days out -> at risk
  const far = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days out -> not at risk
  const cases = [
    { caseId: 'c1', tenantId: m1.id, vertical: 'construction', status: 'OPEN', exposure: 5000, deadline: soon, detectedExceptions: [{ severity: 'high' }] },
    { caseId: 'c2', tenantId: m1.id, vertical: 'construction', status: 'OPEN', exposure: 2500, deadline: far, detectedExceptions: [{ severity: 'med' }] },
    { caseId: 'c3', tenantId: m1.id, vertical: 'healthcare', status: 'CLOSED', exposure: 1000, deadline: soon, detectedExceptions: [{ severity: 'low' }] }, // closed -> excluded from SLA risk
    { caseId: 'c4', tenantId: m1.id, vertical: 'healthcare', status: 'OPEN', exposure: null, deadline: null, detectedExceptions: [{ severity: 'high' }] }, // no exposure figure -> excluded from sum
    { caseId: 'c5', tenantId: m2.id, vertical: 'mortgage', status: 'OPEN', exposure: 9999, deadline: far, detectedExceptions: [{ severity: 'high' }] }, // different tenant -> must not leak into m1's summary
  ];
  const db = await ledger.getDb();
  const col = db.collection('bpo_cases');
  for (const c of cases) await col.insertOne(c);

  const summary = await ledger.memberCaseSummary(m1.id);
  check('memberCaseSummary scopes strictly to the given tenantId (4 of 5 cases)', summary.totalCases === 4);
  check('exposureTotal sums only cases with a real numeric exposure (5000+2500+1000=8500)', summary.exposureTotal === 8500);
  check('exposureCaseCount reflects how many cases actually had exposure data (3)', summary.exposureCaseCount === 3);
  check('isExposurePartial is true when at least one case lacks exposure data', summary.isExposurePartial === true);
  check('slaAtRisk excludes CLOSED cases even with a near deadline (only c1)', summary.slaAtRisk === 1);
  check('byVertical breakdown is exact', summary.byVertical.construction === 2 && summary.byVertical.healthcare === 2);
  check('byStatus breakdown is exact', summary.byStatus.OPEN === 3 && summary.byStatus.CLOSED === 1);
  check('bySeverity breakdown is exact', summary.bySeverity.high === 2 && summary.bySeverity.med === 1 && summary.bySeverity.low === 1);

  const emptySummary = await ledger.memberCaseSummary('member-with-no-cases');
  check('a member with zero tagged cases gets real zeros, not an error', emptySummary.totalCases === 0 && emptySummary.exposureTotal === 0 && emptySummary.isExposurePartial === false);

  console.log(`\n[test-member-summary] ${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
}

main().catch((err) => {
  console.error('[test-member-summary] FAIL (uncaught):', err);
  process.exitCode = 1;
});
