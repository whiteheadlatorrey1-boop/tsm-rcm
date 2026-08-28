'use strict';

const assert = require('assert');

const {
  buildDecisionPackage
} = require('../server/pm/decision-engine');

const {
  buildPortfolioTwin
} = require('../server/pm/portfolio-intelligence');

const {
  calculateRisk
} = require('../server/pm/risk-engine');

const {
  forecast
} = require('../server/pm/forecast-engine');

const {
  buildPmIntelligenceV3,
  verifyPmAction
} = require('../server/pm/intelligence-v3');

const {
  buildPmPredictiveControl
} = require('../server/pm/predictive-control');

const {
  buildActionQueue,
  transition,
  summarizeActions
} = require('../server/pm/action-engine');

console.log('============================================================');
console.log(' TSM PM V5.0 — END-TO-END LIFECYCLE TEST');
console.log('============================================================');

const fixture = {
  properties: [
    {
      id: 'PROP-001',
      name: 'Phoenix Portfolio',
      status: 'ACTIVE'
    }
  ],

  units: [
    {
      id: 'UNIT-101',
      propertyId: 'PROP-001',
      status: 'VACANT',
      exposure: 2500
    }
  ],

  vendors: [
    {
      id: 'VEND-001',
      propertyId: 'PROP-001',
      status: 'EXPIRED',
      exposure: 12000
    }
  ],

  workOrders: [
    {
      id: 'WO-001',
      propertyId: 'PROP-001',
      unitId: 'UNIT-101',
      vendorId: 'VEND-001',
      status: 'OVERDUE',
      exposure: 5500,
      severity: 'high'
    }
  ],

  findings: [
    {
      id: 'S-211',
      propertyId: 'PROP-001',
      unitId: 'UNIT-101',
      domain: 'iot',
      severity: 'critical',
      claim: 'Urgent water leak sensor alert',
      exposure: 3000,
      rationale: 'Leak sensor indicates active water condition.'
    },
    {
      id: 'WO-001',
      propertyId: 'PROP-001',
      unitId: 'UNIT-101',
      domain: 'maintenance',
      severity: 'high',
      claim: 'Overdue maintenance work order',
      exposure: 5500,
      rationale: 'Work order has exceeded expected SLA.'
    },
    {
      id: 'VEND-001',
      propertyId: 'PROP-001',
      domain: 'vendor_compliance',
      severity: 'high',
      claim: 'Vendor compliance credential expired',
      exposure: 12000,
      rationale: 'Vendor should not receive new assignments until renewed.'
    }
  ],

  sections: {
    financials: {
      total_exposure: 23000
    }
  }
};

console.log('\n=== 1. PORTFOLIO TWIN ===');

const twin = buildPortfolioTwin(fixture);

assert.strictEqual(twin.counts.properties, 1);
assert.strictEqual(twin.counts.units, 1);
assert.strictEqual(twin.counts.vendors, 1);
assert.strictEqual(twin.counts.workOrders, 1);
assert.strictEqual(twin.counts.findings, 3);
assert(twin.counts.relationships >= 3);
assert(twin.exposure >= 0);

console.log('PASS: Portfolio Twin');

console.log('\n=== 2. RISK ENGINE ===');

const risk = calculateRisk(twin, fixture);

assert(Number.isFinite(risk.score));
assert(risk.score >= 0);
assert(risk.score <= 100);
assert(Array.isArray(risk.signals));
assert.strictEqual(risk.methodology, 'DETERMINISTIC');
assert.strictEqual(risk.humanReviewRequired, true);

console.log(
  `PASS: Risk score=${risk.score} level=${risk.level}`
);

console.log('\n=== 3. FORECAST ENGINE ===');

const forecastResult = forecast(
  fixture,
  twin,
  risk
);

assert(Number.isFinite(forecastResult.currentExposure));
assert(Number.isFinite(
  forecastResult.modeledProjection.projectedExposure
));
assert(
  forecastResult.modeledProjection.projectedExposure >=
  forecastResult.currentExposure
);
assert.strictEqual(
  forecastResult.methodology,
  'DETERMINISTIC'
);
assert.strictEqual(
  forecastResult.humanApprovalRequired,
  true
);

console.log(
  `PASS: Forecast projected=$${forecastResult.modeledProjection.projectedExposure}`
);

console.log('\n=== 4. EXECUTIVE DECISIONS ===');

const decisionInput = {
  ...fixture,
  twin,
  risk,
  forecast: forecastResult
};

const decisionPackage = buildDecisionPackage(decisionInput);

assert(decisionPackage);
assert(Array.isArray(decisionPackage.decisions));
assert(decisionPackage.decisions.length > 0);

const criticalDecision = decisionPackage.decisions.find(
  d => d.entityId === 'S-211'
);

assert(criticalDecision);
assert.strictEqual(
  criticalDecision.priority,
  'CRITICAL'
);

console.log(
  `PASS: ${decisionPackage.decisions.length} executive decision(s)`
);

console.log('\n=== 5. INTELLIGENCE V3 ===');

const intelligence = buildPmIntelligenceV3(
  decisionPackage
);

assert(intelligence);
assert(Array.isArray(intelligence.actions));
assert(intelligence.actions.length > 0);
assert(intelligence.governance);
assert.strictEqual(
  intelligence.governance.humanApprovalRequired,
  true
);
assert.strictEqual(
  intelligence.governance.sourceSystemWriteback,
  false
);

console.log(
  `PASS: ${intelligence.actions.length} governed action(s)`
);

console.log('\n=== 6. ACTION QUEUE ===');

const actionQueue = buildActionQueue(
  decisionPackage.decisions
);

assert(Array.isArray(actionQueue));
assert(actionQueue.length > 0);

const firstAction = actionQueue[0];

assert(firstAction.id);
assert(
  ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED']
    .includes(firstAction.status)
);

console.log(
  `PASS: Action queue=${actionQueue.length}`
);

console.log('\n=== 7. VALID ACTION TRANSITIONS ===');

let lifecycleAction = {
  ...firstAction,
  status: 'OPEN'
};

lifecycleAction = transition(
  lifecycleAction,
  'ACKNOWLEDGED'
);

assert.strictEqual(
  lifecycleAction.status,
  'ACKNOWLEDGED'
);

lifecycleAction = transition(
  lifecycleAction,
  'IN_PROGRESS'
);

assert.strictEqual(
  lifecycleAction.status,
  'IN_PROGRESS'
);

lifecycleAction = transition(
  lifecycleAction,
  'RESOLVED'
);

assert.strictEqual(
  lifecycleAction.status,
  'RESOLVED'
);

console.log('PASS: OPEN → ACKNOWLEDGED → IN_PROGRESS → RESOLVED');

console.log('\n=== 8. INVALID TRANSITION REJECTION ===');

let invalidRejected = false;

try {
  transition(
    {
      ...firstAction,
      status: 'OPEN'
    },
    'VERIFIED'
  );
} catch (err) {
  invalidRejected = true;
}

assert.strictEqual(
  invalidRejected,
  true
);

console.log('PASS: OPEN → VERIFIED rejected');

console.log('\n=== 9. PREDICTIVE CONTROL ===');

const predictive = buildPmPredictiveControl(
  intelligence
);

assert(predictive.ok);
assert(Array.isArray(predictive.predictions));
assert(predictive.predictionSummary);
assert(
  Number.isFinite(
    predictive.predictionSummary.predictedExposure
  )
);
assert.strictEqual(
  predictive.governance.mode,
  'DETERMINISTIC'
);
assert.strictEqual(
  predictive.governance.llmRequired,
  false
);
assert.strictEqual(
  predictive.governance.humanApprovalRequired,
  true
);
assert.strictEqual(
  predictive.governance.sourceSystemWriteback,
  false
);
assert.strictEqual(
  predictive.governance.predictiveValuesAreModeled,
  true
);

console.log(
  `PASS: Predictions=${predictive.predictions.length} predictedExposure=$${predictive.predictionSummary.predictedExposure}`
);

console.log('\n=== 10. VERIFICATION ===');

const resolved = {
  ...intelligence.actions[0],
  status: 'RESOLVED'
};

const exposureBefore = Number(resolved.exposure || 0);

const verificationResult = verifyPmAction(
  resolved,
  {
    verified: true,
    exposureAfter: 0,
    verifiedBy: 'PM Manager',
    notes: 'Condition inspected, remediation completed, and evidence reviewed.'
  }
);

assert(verificationResult);
assert(verificationResult.verification);
assert.strictEqual(
  verificationResult.verification.verified,
  true
);
assert.strictEqual(
  verificationResult.verification.outcome,
  'CONDITION_CLEARED'
);
assert.strictEqual(
  verificationResult.verification.exposureReduction,
  exposureBefore
);

console.log(
  `PASS: VERIFIED / exposure reduction=$${verificationResult.verification.exposureReduction}`
);

console.log('\n=== 11. ACTION SUMMARY ===');

const verifiedAction = {
  ...verificationResult.action,
  status: 'VERIFIED'
};

const summary = summarizeActions([
  verifiedAction
]);

assert.strictEqual(summary.verified, 1);
assert(
  summary.verifiedExposureReduction >= 0
);

console.log(
  `PASS: verified=${summary.verified} reduction=$${summary.verifiedExposureReduction}`
);

console.log('\n=== 12. GOVERNANCE ASSERTIONS ===');

assert.strictEqual(
  predictive.governance.llmRequired,
  false
);

assert.strictEqual(
  predictive.governance.humanApprovalRequired,
  true
);

assert.strictEqual(
  predictive.governance.sourceSystemWriteback,
  false
);

console.log('PASS: deterministic / human approval / no writeback');

console.log('\n============================================================');
console.log(' TSM PM V5.0 — END-TO-END LIFECYCLE: PASS');
console.log('============================================================');

console.log(JSON.stringify({
  portfolio: twin.counts,
  risk: {
    score: risk.score,
    level: risk.level,
    signals: risk.signals.length
  },
  forecast: {
    currentExposure: forecastResult.currentExposure,
    projectedExposure:
      forecastResult.modeledProjection.projectedExposure
  },
  decisions: decisionPackage.decisions.length,
  actions: intelligence.actions.length,
  predictions: predictive.predictions.length,
  verification: {
    verified: verificationResult.verification.verified,
    outcome: verificationResult.verification.outcome,
    exposureReduction:
      verificationResult.verification.exposureReduction
  },
  governance: predictive.governance
}, null, 2));
