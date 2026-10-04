// Phase 8E wiring test: human-review submission gate + stage-transition
// enforcement in server/staffing-engine-service.js (flag-gated).
//
// Same fake-in-memory-Mongo approach as scripts/test-member-summary.js:
// no real MongoDB reachable in this sandbox, so 'mongodb' is faked
// in-process and injected via Module._resolveFilename before requiring
// the real service. Everything downstream of that require is the REAL,
// unmodified staffing-engine code.
//
// Run from repo root: node scripts/test-staffing-pipeline-wiring.js

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
async function rejects(fn, re) { try { await fn(); return false; } catch (e) { return re.test(e.message); } }

const match = (cid) => ({ jobId: 'j1', candidateId: cid,
  review: { humanReviewRequired: true, automatedDecision: false },
  audit: { matcherVersion: '1.0.0', inputFingerprint: 'fp1' } });
const review = (cid) => ({ decision: 'approved', reviewerId: 'staff1', reviewedAt: '2026-10-01T12:00:00.000Z',
  reviewedFingerprint: 'fp1', candidateId: cid });

async function main() {
  const employer = await engine.upsertEmployer({ name: 'Acme', status: 'active' });
  const job = await engine.upsertJobOrder({ employerId: employer.employerId, title: 'Billing', payRate: 22, feeType: 'contingency', feeValue: 25, openings: 5 });

  // ---- Flag OFF (default): behavior unchanged -------------------------------
  delete process.env.STAFFING_PIPELINE_ENFORCE;
  const p0 = await engine.submitCandidate({ candidateId: 'cand_ready1', jobOrderId: job.jobOrderId });
  check('flag off: submit works with no review (legacy behavior)', p0.status === 'submitted' && p0.humanReview === null);
  const skip = await engine.updatePlacementStatus(p0.placementId, 'placed');
  check('flag off: skipping stages still allowed (legacy behavior)', skip.status === 'placed');
  const pOk = await engine.submitCandidate({ candidateId: 'cand_ready1', jobOrderId: job.jobOrderId, matchResult: match('cand_ready1'), review: review('cand_ready1') });
  check('flag off: valid review is recorded on the placement', pOk.humanReview && pOk.humanReview.reviewerId === 'staff1' && pOk.humanReview.matcherVersion === '1.0.0');
  const pBad = await engine.submitCandidate({ candidateId: 'cand_ready1', jobOrderId: job.jobOrderId, matchResult: match('cand_ready1'), review: { ...review('cand_ready1'), reviewedFingerprint: 'stale' } });
  check('flag off: invalid review is NOT recorded and does not block', pBad.humanReview === null);

  // ---- Flag ON: gate + transitions enforced ----------------------------------
  process.env.STAFFING_PIPELINE_ENFORCE = '1';
  check('flag on: submit with no review is blocked',
    await rejects(() => engine.submitCandidate({ candidateId: 'cand_ready1', jobOrderId: job.jobOrderId }), /Submission blocked.*match-result-missing.*human-review-missing/));
  check('flag on: stale fingerprint is blocked',
    await rejects(() => engine.submitCandidate({ candidateId: 'cand_ready1', jobOrderId: job.jobOrderId, matchResult: match('cand_ready1'), review: { ...review('cand_ready1'), reviewedFingerprint: 'stale' } }), /review-does-not-match-current-match/));
  check('flag on: non-approved review is blocked',
    await rejects(() => engine.submitCandidate({ candidateId: 'cand_ready1', jobOrderId: job.jobOrderId, matchResult: match('cand_ready1'), review: { ...review('cand_ready1'), decision: 'rejected' } }), /review-not-approved/));
  check('flag on: match for a different candidate is blocked',
    await rejects(() => engine.submitCandidate({ candidateId: 'cand_ready2', jobOrderId: job.jobOrderId, matchResult: match('cand_ready1'), review: review('cand_ready1') }), /match-candidate-mismatch/));
  check('flag on: ineligible candidate still blocked by existing eligibility check',
    await rejects(() => engine.submitCandidate({ candidateId: 'cand_nobody', jobOrderId: job.jobOrderId, matchResult: match('cand_nobody'), review: review('cand_nobody') }), /not eligible/));

  const p1 = await engine.submitCandidate({ candidateId: 'cand_ready2', jobOrderId: job.jobOrderId, matchResult: match('cand_ready2'), review: review('cand_ready2') });
  check('flag on: approved, fingerprint-bound review creates the placement', p1.status === 'submitted' && p1.humanReview.reviewedFingerprint === 'fp1');

  check('flag on: skipping stages is blocked (submitted -> placed)',
    await rejects(() => engine.updatePlacementStatus(p1.placementId, 'placed'), /Illegal transition/));
  await engine.updatePlacementStatus(p1.placementId, 'interviewing', { actorId: 'staff1' });
  await engine.updatePlacementStatus(p1.placementId, 'offered');
  const placed = await engine.updatePlacementStatus(p1.placementId, 'placed');
  check('flag on: legal path reaches placed with fee computed', placed.status === 'placed' && placed.computedFee && placed.computedFee.amount === 11440);
  check('flag on: actorId recorded in statusHistory when supplied', placed.statusHistory[1].actorId === 'staff1' && !('actorId' in placed.statusHistory[2]));
  check('flag on: placed cannot go back to interviewing',
    await rejects(() => engine.updatePlacementStatus(p1.placementId, 'interviewing'), /Illegal transition/));
  const ended = await engine.updatePlacementStatus(p1.placementId, 'ended');
  check('flag on: placed -> ended allowed', ended.status === 'ended');
  check('flag on: ended is terminal',
    await rejects(() => engine.updatePlacementStatus(p1.placementId, 'placed'), /Illegal transition/));
  check('invalid status still rejected first', await rejects(() => engine.updatePlacementStatus(p1.placementId, 'bogus'), /Invalid status/));

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}
main().catch((e) => { console.error('Test harness crashed:', e); process.exit(1); });
