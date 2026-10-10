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

  console.log(`\n15H workforce journey: ${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
})().catch((e) => {
  console.error('FATAL', e);
  process.exitCode = 1;
});
