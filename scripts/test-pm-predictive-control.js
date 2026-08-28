'use strict';

const assert = require('assert');

const {
  buildDecisionPackage
} = require('../server/pm/decision-engine');

const {
  buildPmIntelligenceV3
} = require('../server/pm/intelligence-v3');

const {
  buildPmPredictiveControl
} = require('../server/pm/predictive-control');

const fixture = {
  id: 'PM-V4-UNIT',
  vertical: 'PM',

  financials: {
    total_exposure: 40445,
    currency: 'USD'
  },

  findings: [
    {
      id: 'S-211',
      domain: 'iot',
      severity: 'critical',
      finding: 'Urgent water leak sensor alert',
      exposure: 3000
    },
    {
      id: 'V-03',
      domain: 'vendor_compliance',
      severity: 'high',
      finding: 'Vendor V-03 is expired',
      exposure: 25000
    },
    {
      id: 'WO-2201',
      domain: 'maintenance',
      severity: 'high',
      finding: 'WO-2201 is over SLA',
      exposure: 40
    }
  ]
};

/*
 * Canonical TSM PM intelligence chain:
 *
 * findings[]
 *    ↓
 * V1 deterministic Decision Engine
 *    ↓
 * decisions[]
 *    ↓
 * V3 Action / Verification layer
 *    ↓
 * actions[]
 *    ↓
 * V4 Predictive Portfolio Control
 *    ↓
 * predictions[]
 */

const v1 = buildDecisionPackage(fixture);

assert(v1);
assert(Array.isArray(v1.decisions));
assert.strictEqual(v1.decisions.length, 3);

const v3 = buildPmIntelligenceV3(v1);

assert(v3);
assert(Array.isArray(v3.actions));
assert.strictEqual(v3.actions.length, 3);

const result = buildPmPredictiveControl(v3);

assert(result);
assert.strictEqual(result.ok, true);
assert.strictEqual(result.engine, 'pm-predictive-control-v1');

assert.strictEqual(
  result.predictionSummary.total,
  3
);

assert.strictEqual(
  result.predictionSummary.predictedExposure,
  15716
);

assert.strictEqual(
  result.predictionSummary.likely,
  0
);

assert.strictEqual(
  result.predictionSummary.elevated,
  2
);

assert.strictEqual(
  result.predictionSummary.watch,
  1
);

assert.strictEqual(
  result.predictions.length,
  3
);

assert.strictEqual(
  result.controlRecommendations.length,
  2
);

assert.strictEqual(
  result.governance.mode,
  'DETERMINISTIC'
);

assert.strictEqual(
  result.governance.llmRequired,
  false
);

assert.strictEqual(
  result.governance.humanApprovalRequired,
  true
);

assert.strictEqual(
  result.governance.sourceSystemWriteback,
  false
);

assert.strictEqual(
  result.governance.predictiveValuesAreModeled,
  true
);

console.log('PM Predictive Control v4 test: PASS');

console.log(JSON.stringify({
  chain: 'findings → V1 → V3 → V4',

  v1: {
    decisions: v1.decisions.length,
    exposure: v1.decisionSummary.modeledExposure
  },

  v3: {
    actions: v3.actions.length,
    modeledExposure: v3.portfolio.modeledExposure,
    criticalOpen: v3.portfolio.criticalOpen,
    highOpen: v3.portfolio.highOpen
  },

  v4: {
    predictions: result.predictions.length,
    summary: result.predictionSummary,
    recommendations: result.controlRecommendations.length,
    topPrediction: result.predictions[0]
  },

  governance: result.governance
}, null, 2));
