'use strict';

const assert = require('assert');

const integration =
  require('../../html/js/career/tsm-workforce-readiness-integration');

function pass(name) {
  console.log(`PASS: ${name}`);
}

assert.strictEqual(integration.VERSION, '15A.0');
pass('15A integration version');

assert.strictEqual(
  integration.normalizeReadinessScore(86),
  86
);
pass('15A readiness score preserved');

assert.strictEqual(
  integration.normalizeReadinessScore(120),
  100
);
pass('15A readiness score upper clamp');

assert.strictEqual(
  integration.normalizeReadinessScore(-10),
  0
);
pass('15A readiness score lower clamp');

const signal = integration.buildReadinessSignal({
  candidateId: 'CAND-15A-001',
  readinessScore: 86,
  evidenceRefs: ['EV-001', 'EV-002']
});

assert.strictEqual(signal.candidateId, 'CAND-15A-001');
assert.strictEqual(signal.type, 'readiness');
assert.strictEqual(signal.value, 86);
assert.strictEqual(signal.source, 'professional_readiness');
assert.deepStrictEqual(
  signal.evidenceRefs,
  ['EV-001', 'EV-002']
);
pass('15A readiness signal preserves canonical candidate and evidence refs');

const intelligence = integration.buildIntelligence({
  candidateId: 'CAND-15A-001',
  readinessScore: 86,
  evidenceRefs: ['EV-001']
});

assert.strictEqual(
  intelligence.contract.candidateId,
  'CAND-15A-001'
);

assert.strictEqual(intelligence.signals.length, 1);
assert.strictEqual(intelligence.signals[0].value, 86);

assert.ok(
  intelligence.insights.some(i => i.type === 'qualification')
);
pass('15A qualifying readiness produces qualification insight');

assert.ok(
  intelligence.actions.some(
    a => a.type === 'review' && a.requiresHumanReview === true
  )
);
pass('15A qualification produces human-review action');

const gap = integration.buildIntelligence({
  candidateId: 'CAND-15A-002',
  readinessScore: 64,
  evidenceRefs: []
});

assert.ok(
  gap.insights.some(i => i.type === 'gap')
);
pass('15A readiness gap produces gap insight');

assert.ok(
  gap.actions.some(
    a => a.type === 'train' && a.requiresHumanReview === true
  )
);
pass('15A readiness gap produces human-reviewed training action');

assert.throws(
  () => integration.buildReadinessSignal({
    readinessScore: 80
  }),
  /candidateId is required/
);
pass('15A candidate identity remains required');

assert.throws(
  () => integration.buildReadinessSignal({
    candidateId: 'CAND-BAD',
    readinessScore: 'not-a-score'
  }),
  /readinessScore must be numeric/
);
pass('15A invalid readiness rejected');

console.log(
  '\nPHASE 15A WORKFORCE READINESS INTEGRATION TESTS — PASS'
);
