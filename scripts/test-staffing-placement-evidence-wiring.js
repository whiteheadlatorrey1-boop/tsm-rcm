// Phase 8F wiring test: placement-evidence persistence in
// server/staffing-engine-service.js (flag-gated, best-effort, own collection).
//
// Same fake-in-memory-Mongo approach as scripts/test-member-summary.js:
// no real MongoDB reachable in this sandbox, so 'mongodb' is faked
// in-process and injected via Module._resolveFilename before requiring
// the real service. Everything downstream of that require is the REAL,
// unmodified staffing-engine code.
//
// Run from repo root: node scripts/test-staffing-placement-evidence-wiring.js

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
  async updateOne(query, update, opts) {
    const existing = this.docs.find((d) => matches(d, query));
    const setFields = (update && update.$set) || {};
    if (existing) {
      Object.assign(existing, setFields);
      return { matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
    }
    if (opts && opts.upsert) {
      const doc = { ...query, ...setFields };
      this.docs.push(doc);
      return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
    }
    return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
  }
  async deleteOne(query) {
    const idx = this.docs.findIndex((d) => matches(d, query));
    if (idx === -1) return { deletedCount: 0 };
    this.docs.splice(idx, 1);
    return { deletedCount: 1 };
  }
  async deleteMany(query) {
    const before = this.docs.length;
    this.docs = this.docs.filter((d) => !matches(d, query));
    return { deletedCount: before - this.docs.length };
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


const registry = require(path.join(__dirname, '..', 'server', 'candidate-registry-service.js'));
registry.getCandidate = async (id) => (id === 'cand_ready1' || id === 'cand_ready2'
  ? { candidateId: id, status: 'ready_for_placement', readinessScore: 85 } : null);

const engine = require(path.join(__dirname, '..', 'server', 'staffing-engine-service.js'));

let passed = 0, failed = 0;
function check(label, cond) {
  if (cond) { passed++; console.log(`  PASS: ${label}`); } else { failed++; console.error(`  FAIL: ${label}`); }
}
const COL = 'staffing_placement_evidence';
const match = (cid) => ({ jobId: 'j1', candidateId: cid,
  review: { humanReviewRequired: true, automatedDecision: false },
  audit: { matcherVersion: '1.0.0', inputFingerprint: 'fp1' } });
const review = (cid) => ({ decision: 'approved', reviewerId: 'staff1', reviewedAt: '2026-10-01T12:00:00.000Z', reviewedFingerprint: 'fp1', candidateId: cid });

async function main() {
  const db = await engine.connect();
  const employer = await engine.upsertEmployer({ name: 'Acme', status: 'active' });
  const job = await engine.upsertJobOrder({ employerId: employer.employerId, title: 'Billing', payRate: 22, feeType: 'contingency', feeValue: 25, openings: 9 });
  const count = () => (db.collections[COL] ? db.collections[COL].docs.length : 0);

  // ---- Flag OFF (default): nothing recorded --------------------------------
  delete process.env.STAFFING_PLACEMENT_EVIDENCE;
  delete process.env.STAFFING_PIPELINE_ENFORCE;
  const off = await engine.submitCandidate({ candidateId: 'cand_ready1', jobOrderId: job.jobOrderId });
  await engine.updatePlacementStatus(off.placementId, 'interviewing');
  check('flag off: no evidence recorded on submit or advance', count() === 0);
  check('flag off: recordPlacementEvidence is a no-op', (await engine.recordPlacementEvidence(off)).recorded === 0 && count() === 0);

  // ---- Flag ON: records accumulate per stage -------------------------------
  process.env.STAFFING_PLACEMENT_EVIDENCE = '1';
  process.env.STAFFING_PIPELINE_ENFORCE = '1';
  const p = await engine.submitCandidate({ candidateId: 'cand_ready2', jobOrderId: job.jobOrderId, matchResult: match('cand_ready2'), review: review('cand_ready2') });
  check('flag on: submit records one "submitted" outcome', count() === 1);
  await engine.updatePlacementStatus(p.placementId, 'interviewing', { actorId: 'staff1' });
  await engine.updatePlacementStatus(p.placementId, 'offered');
  await engine.updatePlacementStatus(p.placementId, 'placed');
  const recs = await engine.listPlacementEvidence({ placementId: p.placementId });
  check('flag on: one record per stage, oldest first', recs.map((r) => r.stage).join() === 'submitted,interviewing,offered,placed');
  check('flag on: human-review reference lands on the submitted record only',
    recs[0].humanReview && recs[0].humanReview.reviewerId === 'staff1' && recs.slice(1).every((r) => r.humanReview === null));
  check('flag on: actorId captured when supplied', recs[1].actorId === 'staff1');
  check('flag on: records carry no score / weight / dimensions / category',
    recs.every((r) => ['score', 'scored', 'weight', 'dimensions', 'category', 'kind'].every((k) => !(k in r))));

  // ---- Idempotent -----------------------------------------------------------
  const before = count();
  const again = await engine.recordPlacementEvidence(await engine.getPlacement(p.placementId));
  check('re-recording the same placement adds nothing', again.recorded === 0 && count() === before);

  // ---- Filtering ------------------------------------------------------------
  check('listPlacementEvidence filters by candidate', (await engine.listPlacementEvidence({ candidateId: 'cand_ready2' })).length === 4);
  check('listPlacementEvidence filters by stage', (await engine.listPlacementEvidence({ stage: 'placed' })).length === 1);

  // ---- Append-only: deleting a placement keeps its outcome history ---------
  await engine.deletePlacement(p.placementId);
  check('deleting a placement does not delete its evidence', (await engine.listPlacementEvidence({ placementId: p.placementId })).length === 4);

  // ---- Best-effort: an evidence failure never breaks the pipeline ---------
  const p2 = await engine.submitCandidate({ candidateId: 'cand_ready1', jobOrderId: job.jobOrderId, matchResult: match('cand_ready1'), review: review('cand_ready1') });
  const origInsert = db.collection(COL).insertOne.bind(db.collection(COL));
  db.collection(COL).insertOne = async () => { throw new Error('evidence store down'); };
  const origErr = console.error; let logged = '';
  console.error = (...a) => { logged += a.join(' '); };
  let advanced = null, threw = false;
  try { advanced = await engine.updatePlacementStatus(p2.placementId, 'interviewing'); } catch (e) { threw = true; }
  console.error = origErr;
  db.collection(COL).insertOne = origInsert;
  check('evidence failure does not block the status change', !threw && advanced && advanced.status === 'interviewing');
  check('evidence failure is logged, not swallowed silently', /placement evidence not recorded/.test(logged));

  // ---- Boundary: only staffing_* collections were touched ------------------
  const names = Object.keys(db.collections);
  check('all collections written are staffing_* (evidence has its own store)', names.every((n) => /^staffing_/.test(n)));

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}
main().catch((e) => { console.error('Test harness crashed:', e); process.exit(1); });
