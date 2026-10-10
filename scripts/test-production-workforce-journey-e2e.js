'use strict';

// 15H: workforce journey. Real pure contracts (requisition, application),
// the REAL candidate-registry service (fake Mongo driver, fully offline),
// and the workforce adapter + envelope contract.
// NOT covered yet: placement-eligibility engine, staffing route.

const assert = require('assert');
const Module = require('module');

const contract = require('../html/js/career/tsm-ats-hris-wfm-contract');
const requisition = require('../html/js/career/tsm-ats-requisition');
const application = require('../html/js/career/tsm-ats-application');
const { fromReadiness } = require('../server/vertical-control-plane/adapters/workforce-adapter');
const { validateEnvelope } = require('../server/vertical-control-plane/contract');
const readinessView = require('../server/workforce-readiness-view');

// ---- fake mongodb driver (in-memory, never connects) ----------------------
const candidates = new Map();
const trainingEvents = [];

const matches = (doc, query) =>
  Object.entries(query || {}).every(([k, v]) => doc[k] === v);

function makeCollection(name) {
  const isEvents = name === 'candidate_training_events';
  const rows = () => (isEvents ? trainingEvents : [...candidates.values()]);
  return {
    async findOne(query) {
      const hit = rows().find((d) => matches(d, query));
      return hit ? { ...hit } : null;
    },
    find(query) {
      let results = rows().filter((d) => matches(d, query)).map((d) => ({ ...d }));
      const api = {
        sort() { return api; },
        limit(n) { results = results.slice(0, n); return api; },
        async toArray() { return results; }
      };
      return api;
    },
    async updateOne(query, update, opts) {
      if (isEvents) throw new Error('updateOne only stubbed for candidates');
      const existing = candidates.get(query.candidateId) || null;
      if (!existing && !(opts && opts.upsert)) return { matchedCount: 0, modifiedCount: 0 };
      const next = existing ? { ...existing } : {};
      if (update.$set) Object.assign(next, update.$set);
      candidates.set(query.candidateId, next);
      return { matchedCount: existing ? 1 : 0, modifiedCount: existing ? 1 : 0 };
    },
    async insertOne(doc) {
      if (isEvents) trainingEvents.push({ ...doc });
      return { acknowledged: true, insertedId: 'fake-id' };
    }
  };
}

class FakeMongoClient {
  constructor() {}
  async connect() { return this; }
  db() { return { collection: (n) => makeCollection(n) }; }
  async close() {}
}
class FakeObjectId { constructor(v) { this.v = v; } toString() { return String(this.v); } }

process.env.MONGODB_URI = 'mongodb://fake.invalid:27017/15h-journey';

const origLoad = Module._load;
Module._load = function (request) {
  if (request === 'mongodb') return { MongoClient: FakeMongoClient, ObjectId: FakeObjectId };
  return origLoad.apply(this, arguments);
};
const registry = require('../server/candidate-registry-service');
const staffing = require('../server/staffing-engine-service');
Module._load = origLoad;

// ---- harness --------------------------------------------------------------
let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`PASS: ${name}`);
  } catch (error) {
    failed++;
    console.error(`FAIL: ${name} - ${error.message}`);
  }
}

function viewFrom(c) {
  return {
    candidateId: c.candidateId,
    name: c.name,
    readinessScore: c.readinessScore,
    readinessBasis: c.readinessBasis,
    isSampleData: c.isSampleData,
    signal: { signalId: 'SIG-15H-001', type: 'readiness', value: c.readinessScore, source: 'assessment' },
    insights: [{ type: 'ready', title: 'Readiness computed by registry' }],
    actions: [{
      type: 'placement-review',
      title: 'Review placement',
      reason: 'Readiness eligible',
      requiresHumanReview: true
    }]
  };
}

(async () => {
  let reqOpen, candidate, appSubmitted, ready, events, low;

  await check('requisition opens through an attributed transition', () => {
    const draft = requisition.normalize({
      requisitionId: 'REQ-15H-001',
      accountId: 'ACCT-15H-001',
      title: 'IT Support Technician',
      openings: 1,
      requiredCompetencies: ['IT support', 'incident handling']
    });
    reqOpen = requisition.transition(draft, 'open', 'human-reviewer');
    assert.strictEqual(reqOpen.state, 'open');
    assert.strictEqual(reqOpen.lastActorId, 'human-reviewer');
  });

  await check('invalid requisition transition is rejected', () => {
    assert.throws(() => requisition.transition(reqOpen, 'draft', 'human-reviewer'));
  });

  await check('registry intake: upsert creates a non-sample candidate with no readiness', async () => {
    candidate = await registry.upsertCandidate({
      candidateId: 'CAND-15H-READY',
      name: 'Journey Test Candidate',
      role: 'IT Support Technician',
      status: 'in_training',
      source: '15h-journey-test',
      isSampleData: false
    });
    assert.strictEqual(candidate.candidateId, 'CAND-15H-READY');
    assert.strictEqual(candidate.isSampleData, false);
    assert.strictEqual(candidate.readinessScore, 0);
    assert.strictEqual(candidate.readinessBasis, 'no-training-data');
  });

  await check('registry defaults a candidate to sample data unless told otherwise', async () => {
    const c = await registry.upsertCandidate({ candidateId: 'CAND-15H-DEFAULT', name: 'Default Flags' });
    assert.strictEqual(c.isSampleData, true);
  });

  await check('application submits against the opened requisition and registry candidate', () => {
    const draft = application.create({
      applicationId: 'APP-15H-001',
      candidateId: candidate.candidateId,
      requisitionId: reqOpen.requisitionId
    });
    appSubmitted = application.transition(draft, 'submitted', 'candidate');
    assert.strictEqual(appSubmitted.state, 'submitted');
    assert.strictEqual(appSubmitted.requisitionId, reqOpen.requisitionId);
    assert.strictEqual(appSubmitted.candidateId, candidate.candidateId);
    assert.strictEqual(appSubmitted.history.length, 1);
  });

  await check('contract keeps candidate, requisition, application domains separate', () => {
    const c = contract.createContract({
      candidate: { candidateId: candidate.candidateId },
      requisition: reqOpen
    });
    assert.ok(c.candidate);
    assert.ok(c.requisition);
    assert.strictEqual(c.application, null);
  });

  await check('registry rejects malformed training events', async () => {
    await assert.rejects(() => registry.recordTrainingEvent('CAND-15H-READY', {}), /type/i);
    await assert.rejects(
      () => registry.recordTrainingEvent('CAND-15H-READY', { type: 'quiz', score: 80, weight: 0 }),
      /weight/i
    );
  });

  await check('training events accumulate and the service computes readiness', async () => {
    await registry.recordTrainingEvent(candidate.candidateId, { type: 'quiz', score: 70 });
    await registry.recordTrainingEvent(candidate.candidateId, { type: 'lab', score: 80 });
    ready = await registry.recordTrainingEvent(candidate.candidateId, { type: 'assessment', score: 90 });
    events = await registry.listTrainingEvents(candidate.candidateId);
    assert.strictEqual(events.length, 3);
    assert.strictEqual(ready.readinessBasis, 'weighted-average-of-training-events');
    assert.ok(ready.readinessScore > 0);
    assert.strictEqual(ready.readinessScore, registry.computeReadinessScore(events).score);
    assert.strictEqual(ready.isSampleData, false);
  });

  await check('registry readiness drives a valid, approval-gated envelope', () => {
    const evidence = [{
      placementEvidenceId: 'EVID-15H-001',
      eventType: 'SUBMITTED',
      stage: 'submitted',
      occurredAt: '2026-10-10T00:00:00Z',
      candidateId: ready.candidateId,
      placementId: 'PLACEMENT-15H-001',
      jobOrderId: 'JOB-15H-001'
    }];
    // STUB: eligibility is not produced by the real placement engine yet.
    const eligibility = { eligible: true, reason: 'eligible', readinessScore: ready.readinessScore };
    const env = fromReadiness({ candidateId: ready.candidateId }, viewFrom(ready), eligibility, { evidence });

    assert.strictEqual(validateEnvelope(env), true);
    assert.strictEqual(env.vertical, 'workforce');
    assert.ok(env.entities.some((e) => e.id === ready.candidateId));
    assert.ok(env.events.some((e) => e.type === 'READINESS_SIGNAL'));
    assert.strictEqual(env.decisions[0].eligible, true);
    assert.strictEqual(env.decisions[0].requiresApproval, true);
    assert.strictEqual(env.decisions[0].executed, false);
    assert.strictEqual(env.governance.approvalRequired, true);
    assert.strictEqual(env.governance.approved, false);
    assert.strictEqual(env.actions[0].allowed, false);
    assert.strictEqual(env.actions[0].executed, false);
    assert.strictEqual(env.outcomes.length, 1);
    assert.strictEqual(env.outcomes[0].placementEvidenceId, 'EVID-15H-001');
  });

  await check('low registry readiness stays blocked and explains why', async () => {
    await registry.upsertCandidate({
      candidateId: 'CAND-15H-NOT-READY',
      name: 'Not Ready Candidate',
      isSampleData: false
    });
    low = await registry.recordTrainingEvent('CAND-15H-NOT-READY', { type: 'quiz', score: 35 });
    const eligibility = { eligible: false, reason: 'candidate-not-ready', readinessScore: low.readinessScore };
    const env = fromReadiness({ candidateId: low.candidateId }, viewFrom(low), eligibility);

    assert.strictEqual(validateEnvelope(env), true);
    assert.strictEqual(env.decisions[0].eligible, false);
    assert.strictEqual(env.decisions[0].executed, false);
    assert.strictEqual(env.governance.approved, false);
    assert.ok(env.findings.some(
      (f) => f.type === 'PLACEMENT_INELIGIBLE' && f.reason === 'candidate-not-ready'
    ));
    assert.ok(low.readinessScore < ready.readinessScore);
  });

  await check('unknown candidate fails closed without throwing', async () => {
    const missing = await registry.getCandidate('CAND-15H-UNKNOWN');
    assert.ok(!missing);
    const env = fromReadiness({ candidateId: 'CAND-15H-UNKNOWN' }, missing || null, null);
    assert.strictEqual(validateEnvelope(env), true);
    assert.strictEqual(env.decisions[0].eligible, false);
    assert.strictEqual(env.governance.approved, false);
  });

  await check('real eligibility engine accepts a ready_for_placement candidate', async () => {
    await registry.upsertCandidate({
      candidateId: 'CAND-15H-READY',
      name: 'Journey Test Candidate',
      role: 'IT Support Technician',
      status: 'ready_for_placement',
      source: '15h-journey-test',
      isSampleData: false
    });
    const c = await registry.getCandidate('CAND-15H-READY');
    const elig = staffing.evaluatePlacementEligibility(c);
    assert.strictEqual(elig.eligible, true, 'got ' + JSON.stringify(elig));
    assert.strictEqual(elig.reason, 'eligible');
    const env = fromReadiness({ candidateId: c.candidateId }, viewFrom(c), elig);
    assert.strictEqual(validateEnvelope(env), true);
    assert.strictEqual(env.decisions[0].eligible, true);
    assert.strictEqual(env.decisions[0].executed, false);
    assert.strictEqual(env.governance.approved, false);
  });

  await check('real engine blocks a ready-status candidate below the readiness threshold', async () => {
    await registry.upsertCandidate({
      candidateId: 'CAND-15H-NOT-READY',
      name: 'Not Ready Candidate',
      status: 'ready_for_placement',
      isSampleData: false
    });
    const c = await registry.getCandidate('CAND-15H-NOT-READY');
    const elig = staffing.evaluatePlacementEligibility(c);
    assert.strictEqual(elig.eligible, false, 'got ' + JSON.stringify(elig));
    assert.strictEqual(elig.reason, 'readiness-below-threshold');
    const env = fromReadiness({ candidateId: c.candidateId }, viewFrom(c), elig);
    assert.strictEqual(validateEnvelope(env), true);
    assert.strictEqual(env.decisions[0].eligible, false);
    assert.strictEqual(env.governance.approved, false);
    assert.ok(env.findings.some((f) => f.type === 'PLACEMENT_INELIGIBLE' && f.reason === 'readiness-below-threshold'));
  });

  await check('real engine rejects in-training, sample and unknown candidates', async () => {
    await registry.upsertCandidate({ candidateId: 'CAND-15H-TRAINING', name: 'In Training', isSampleData: false });
    const training = staffing.evaluatePlacementEligibility(await registry.getCandidate('CAND-15H-TRAINING'));
    assert.strictEqual(training.reason, 'candidate-not-ready');
    const sample = staffing.evaluatePlacementEligibility(await registry.getCandidate('CAND-15H-DEFAULT'));
    assert.strictEqual(sample.reason, 'sample-candidate');
    const unknown = staffing.evaluatePlacementEligibility(await registry.getCandidate('CAND-15H-UNKNOWN'));
    assert.strictEqual(unknown.reason, 'candidate-not-found');
  });

  await check('real 15B view for a registry candidate feeds the real engine and adapter', async () => {
    const r = await readinessView.resolveReadinessIntelligence('CAND-15H-READY', registry.getCandidate);
    assert.strictEqual(r.status, 200, 'got ' + JSON.stringify(r));
    assert.strictEqual(r.body.readOnly, true);
    assert.strictEqual(r.body.candidateId, 'CAND-15H-READY');
    assert.strictEqual(r.body.isSampleData, false);
    const c = await registry.getCandidate('CAND-15H-READY');
    const elig = staffing.evaluatePlacementEligibility(c);
    assert.strictEqual(elig.eligible, true, 'got ' + JSON.stringify(elig));
    const env = fromReadiness({ candidateId: c.candidateId }, r.body, elig);
    assert.strictEqual(validateEnvelope(env), true);
    assert.strictEqual(env.decisions[0].eligible, true);
    assert.strictEqual(env.decisions[0].executed, false);
    assert.strictEqual(env.governance.approved, false);
  });

  await check('15B resolver returns 404 for an unknown candidate and 400 for a missing id', async () => {
    const unknown = await readinessView.resolveReadinessIntelligence('CAND-15H-UNKNOWN', registry.getCandidate);
    assert.strictEqual(unknown.status, 404);
    const missing = await readinessView.resolveReadinessIntelligence('', registry.getCandidate);
    assert.strictEqual(missing.status, 400);
  });

  await check('15B view reports no_evidence for a candidate with no events and the adapter fails closed', async () => {
    const r = await readinessView.resolveReadinessIntelligence('CAND-15H-TRAINING', registry.getCandidate);
    assert.strictEqual(r.status, 200, 'got ' + JSON.stringify(r));
    assert.strictEqual(r.body.state, 'no_evidence');
    assert.strictEqual(r.body.insights.length, 0);
    assert.strictEqual(r.body.actions.length, 0);
    assert.strictEqual(r.body.humanReviewRequired, false);
    const c = await registry.getCandidate('CAND-15H-TRAINING');
    const elig = staffing.evaluatePlacementEligibility(c);
    assert.strictEqual(elig.eligible, false);
    const env = fromReadiness({ candidateId: c.candidateId }, r.body, elig);
    assert.strictEqual(validateEnvelope(env), true);
    assert.strictEqual(env.decisions[0].eligible, false);
    assert.strictEqual(env.governance.approved, false);
  });

  console.log(`\n15H workforce journey: ${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
})().catch((e) => {
  console.error('FATAL', e);
  process.exitCode = 1;
});
