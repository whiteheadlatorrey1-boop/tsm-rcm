'use strict';

const assert = require('assert');
const { buildDecisionPackage } = require('../server/pm/decision-engine');

const fixture = {
  sections: {
    financials: {
      total_exposure: 40445
    },

    exceptionReport: {
      exceptions: [
        {
          id: 'V-03',
          domain: 'vendor_compliance',
          claim: 'Vendor V-03 is expired',
          severity: 'high',
          exposure: 25000,
          sources: ['pm-engine.js computeKpis()']
        },
        {
          id: 'WO-2201',
          domain: 'maintenance',
          claim: 'WO-2201 is over SLA',
          severity: 'high',
          exposure: 40,
          sources: ['pm-engine.js getSlaBreaches()']
        }
      ]
    },

    riskReport: {
      risks: [
        {
          id: 'S-211',
          domain: 'iot',
          claim: 'Urgent water leak sensor alert',
          severity: 'critical',
          exposure: 3000,
          sources: ['pm-iot-engine.js']
        }
      ]
    }
  }
};

const result = buildDecisionPackage(fixture);

assert(result);
assert(Array.isArray(result.decisions));
assert(Array.isArray(result.recommendedActions));
assert(Array.isArray(result.auditTrail));
assert(result.executiveSummary);

assert.strictEqual(result.decisionSummary.modeledExposure, 40445);
assert.strictEqual(result.decisions[0].entityId, 'S-211');
assert.strictEqual(result.decisions[0].priority, 'CRITICAL');

console.log('PM decision engine test: PASS');
console.log(JSON.stringify({
  exposure: result.executiveSummary.modeledExposure,
  decisions: result.decisions.length,
  top: result.decisions[0]
}, null, 2));
