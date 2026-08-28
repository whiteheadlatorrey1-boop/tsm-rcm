'use strict';

const assert = require('assert');

const {
  buildDecisionPackage
} = require('../server/pm/decision-engine');

const {
  buildPmIntelligenceV3,
  verifyPmAction
} = require('../server/pm/intelligence-v3');

const {
  buildActionQueue,
  transition,
  summarizeActions
} = require('../server/pm/action-engine');

const fixture = {
  sections: {
    financials: {
      total_exposure: 23000
    }
  },

  findings: [
    {
      id: 'S-211',
      domain: 'iot',
      severity: 'critical',
      claim: 'Urgent water leak sensor alert',
      exposure: 3000,
      rationale: 'Leak sensor indicates active water condition.'
    },
    {
      id: 'WO-001',
      domain: 'maintenance',
      severity: 'high',
      claim: 'Overdue maintenance work order',
      exposure: 5500,
      rationale: 'Work order has exceeded expected SLA.'
    },
    {
      id: 'VEND-001',
      domain: 'vendor_compliance',
      severity: 'high',
      claim: 'Vendor compliance credential expired',
      exposure: 12000,
      rationale: 'Vendor should not receive new assignments.'
    }
  ]
};

console.log('============================================================');
console.log(' TSM PM V5.2 — IDEMPOTENCY TEST');
console.log('============================================================');

console.log('\n=== 1. FIRST DECISION BUILD ===');

const first = buildDecisionPackage(fixture);

assert(first);
assert(Array.isArray(first.decisions));
assert(first.decisions.length === 3);

console.log(
  `PASS: first build produced ${first.decisions.length} decisions`
);

console.log('\n=== 2. SECOND IDENTICAL DECISION BUILD ===');

const second = buildDecisionPackage(fixture);

assert(second);
assert(Array.isArray(second.decisions));
assert.strictEqual(
  second.decisions.length,
  first.decisions.length
);

console.log(
  `PASS: identical input produced ${second.decisions.length} decisions`
);

console.log('\n=== 3. DECISION ID STABILITY ===');

const firstIds = first.decisions.map(x => x.id);
const secondIds = second.decisions.map(x => x.id);

assert.deepStrictEqual(firstIds, secondIds);

console.log(
  `PASS: decision IDs stable: ${firstIds.join(', ')}`
);

console.log('\n=== 4. DECISION ENTITY STABILITY ===');

const firstEntities = first.decisions.map(
  x => `${x.domain}:${x.entityId}`
);

const secondEntities = second.decisions.map(
  x => `${x.domain}:${x.entityId}`
);

assert.deepStrictEqual(firstEntities, secondEntities);

console.log('PASS: decision entity identities stable');

console.log('\n=== 5. INTELLIGENCE BUILD ===');

const intelligence1 = buildPmIntelligenceV3(first);

assert(intelligence1);
assert(Array.isArray(intelligence1.actions));
assert.strictEqual(intelligence1.actions.length, 3);

console.log(
  `PASS: first intelligence build produced ${intelligence1.actions.length} actions`
);

console.log('\n=== 6. REPEATED INTELLIGENCE BUILD ===');

const intelligence2 = buildPmIntelligenceV3(first);

assert(intelligence2);
assert(Array.isArray(intelligence2.actions));
assert.strictEqual(
  intelligence2.actions.length,
  intelligence1.actions.length
);

console.log(
  `PASS: repeated intelligence build produced ${intelligence2.actions.length} actions`
);

console.log('\n=== 7. ACTION ID STABILITY ===');

const actionIds1 = intelligence1.actions.map(x => x.id);
const actionIds2 = intelligence2.actions.map(x => x.id);

assert.deepStrictEqual(actionIds1, actionIds2);

console.log(
  `PASS: action IDs stable: ${actionIds1.join(', ')}`
);

console.log('\n=== 8. ACTION QUEUE DUPLICATE CHECK ===');

const queue1 = buildActionQueue(first.decisions);
const queue2 = buildActionQueue(first.decisions);

assert.strictEqual(queue1.length, queue2.length);

const uniqueQueueIds = new Set(
  queue1.map(x => x.id)
);

assert.strictEqual(
  uniqueQueueIds.size,
  queue1.length
);

console.log(
  `PASS: ${queue1.length} unique action IDs`
);

console.log('\n=== 9. VERIFICATION ===');

const resolved = {
  ...intelligence1.actions[0],
  status: 'RESOLVED'
};

const exposureBefore = Number(resolved.exposure || 0);

const verification1 = verifyPmAction(
  resolved,
  {
    verified: true,
    exposureAfter: 0,
    verifiedBy: 'PM Manager',
    notes: 'Condition cleared.'
  }
);

assert(verification1.verification);
assert.strictEqual(
  verification1.verification.verified,
  true
);

assert.strictEqual(
  verification1.verification.exposureReduction,
  exposureBefore
);

console.log(
  `PASS: first verification reduction=$${verification1.verification.exposureReduction}`
);

console.log('\n=== 10. REPEATED VERIFICATION ===');

const verification2 = verifyPmAction(
  {
    ...verification1.action,
    status: 'RESOLVED'
  },
  {
    verified: true,
    exposureAfter: 0,
    verifiedBy: 'PM Manager',
    notes: 'Repeated verification attempt.'
  }
);

assert(verification2.verification);
assert.strictEqual(
  verification2.verification.verified,
  true
);

console.log(
  `PASS: repeated verification remains valid`
);

console.log('\n=== 11. VERIFIED ACTION SUMMARY ===');

const verified = {
  ...verification1.action,
  status: 'VERIFIED'
};

const summary = summarizeActions([verified]);

assert.strictEqual(summary.verified, 1);
assert(
  summary.verifiedExposureReduction >= 0
);

console.log(
  `PASS: verified=${summary.verified} reduction=$${summary.verifiedExposureReduction}`
);

console.log('\n=== 12. INVALID VERIFIED TRANSITION ===');

let rejected = false;

try {
  transition(
    {
      ...verified,
      status: 'VERIFIED'
    },
    'IN_PROGRESS'
  );
} catch (err) {
  rejected = true;
}

assert.strictEqual(rejected, true);

console.log('PASS: VERIFIED → IN_PROGRESS rejected');

console.log('\n=== 13. GOVERNANCE ===');

assert.strictEqual(
  intelligence1.governance.humanApprovalRequired,
  true
);

assert.strictEqual(
  intelligence1.governance.sourceSystemWriteback,
  false
);

console.log(
  'PASS: human approval + no source-system writeback'
);

console.log('\n============================================================');
console.log(' TSM PM V5.2 — IDEMPOTENCY TEST: PASS');
console.log('============================================================');
