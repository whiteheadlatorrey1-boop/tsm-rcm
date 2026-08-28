'use strict';

const assert = require('assert');

const {
  buildPmIntelligenceV3,
  verifyPmAction
} = require('../server/pm/intelligence-v3');

const fixture = {
  decisionSummary: {
    modeledExposure: 40445
  },

  decisions: [
    {
      id: 'PM-DEC-001',
      priority: 'CRITICAL',
      domain: 'iot',
      entityId: 'S-211',
      finding: 'Urgent water leak sensor alert',
      exposure: 3000,
      action: 'Dispatch inspection/remediation for S-211.',
      owner: 'Maintenance Operations',
      urgency: 'Immediate'
    },
    {
      id: 'PM-DEC-002',
      priority: 'HIGH',
      domain: 'vendor_compliance',
      entityId: 'V-03',
      finding: 'Vendor V-03 is expired',
      exposure: 25000,
      action: 'Complete compliance renewal for V-03.',
      owner: 'Vendor Management',
      urgency: 'Today'
    },
    {
      id: 'PM-DEC-003',
      priority: 'HIGH',
      domain: 'maintenance',
      entityId: 'WO-2201',
      finding: 'WO-2201 is over SLA',
      exposure: 40,
      action: 'Escalate WO-2201.',
      owner: 'Maintenance Operations',
      urgency: 'Today'
    }
  ]
};

const result = buildPmIntelligenceV3(fixture);

assert(result.ok);
assert.strictEqual(result.engine, 'pm-intelligence-v3');
assert.strictEqual(result.actions.length, 3);
assert.strictEqual(result.actionSummary.total, 3);
assert.strictEqual(result.actionSummary.open, 3);
assert.strictEqual(result.portfolio.modeledExposure, 40445);
assert.strictEqual(result.portfolio.criticalOpen, 1);
assert.strictEqual(result.portfolio.highOpen, 2);
assert(result.operatingLoop.decide);
assert(result.operatingLoop.execute);
assert(result.governance.humanApprovalRequired);
assert.strictEqual(result.governance.sourceSystemWriteback, false);

const resolved = {
  ...result.actions[0],
  status: 'RESOLVED'
};

const verificationResult = verifyPmAction(resolved, {
  verified: true,
  exposureAfter: 0,
  verifiedBy: 'PM Manager',
  notes: 'Leak condition cleared and inspection completed.'
});

assert(verificationResult.verification.verified);
assert.strictEqual(verificationResult.verification.outcome, 'CONDITION_CLEARED');
assert.strictEqual(verificationResult.verification.exposureReduction, 3000);

console.log('PM Intelligence v3 test: PASS');
console.log(JSON.stringify({
  engine: result.engine,
  modeledExposure: result.portfolio.modeledExposure,
  actions: result.actionSummary,
  verification: {
    outcome: verificationResult.verification.outcome,
    exposureReduction: verificationResult.verification.exposureReduction
  }
}, null, 2));
