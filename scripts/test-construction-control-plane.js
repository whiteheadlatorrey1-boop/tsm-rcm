'use strict';

const assert = require('node:assert');

const {
  buildFindings,
  buildExposures,
  buildPredictions,
  selectAction,
  runConstructionControlPlane
} = require('../server/construction/construction-control-plane');

console.log('=== CONSTRUCTION CONTROL PLANE TEST ===');

const input = {
  sections: {
    costOverruns: [
      {
        id: 'CO-100',
        projectId: 'PROJ-1',
        costImpact: 25000,
        severity: 'high'
      }
    ],

    scheduleDelays: [
      {
        id: 'SCH-100',
        projectId: 'PROJ-1',
        costImpact: 12000,
        severity: 'medium'
      }
    ],

    permitCompliance: [
      {
        id: 'PERMIT-100',
        projectId: 'PROJ-1',
        status: 'expired',
        severity: 'high'
      }
    ],

    safetyIncidents: [
      {
        id: 'SAFE-100',
        projectId: 'PROJ-2',
        costImpact: 5000,
        severity: 'critical'
      }
    ]
  }
};

const twin = require('../server/construction/portfolio-intelligence')
  .buildPortfolioTwin(input);

assert.strictEqual(
  twin.counts.costOverruns,
  1,
  'cost overrun normalization failed'
);

console.log('PASS: Construction portfolio normalization');

const findings = buildFindings(twin);

assert(
  findings.some(f => f.type === 'cost_overrun'),
  'cost overrun finding missing'
);

assert(
  findings.some(f => f.type === 'schedule_delay'),
  'schedule delay finding missing'
);

assert(
  findings.some(f => f.type === 'permit_compliance'),
  'permit compliance finding missing'
);

assert(
  findings.some(f => f.type === 'safety_incident'),
  'safety incident finding missing'
);

console.log('PASS: Construction findings');

const exposures = buildExposures(twin);

assert(
  exposures.some(
    x => x.type === 'cost_overrun' && x.amount === 25000
  ),
  'cost exposure missing'
);

console.log('PASS: Construction exposures');

const predictions = buildPredictions(twin);

assert(
  predictions.some(
    p => p.metric === 'cost_overrun_exposure'
  ),
  'cost prediction missing'
);

assert(
  predictions.some(
    p => p.metric === 'permit_compliance_findings'
  ),
  'permit prediction missing'
);

console.log('PASS: Construction predictions');

assert.strictEqual(
  selectAction(twin),
  'construction:escalate_safety',
  'safety action should have highest priority'
);

console.log('PASS: Domain action selection');

const result = runConstructionControlPlane(input);

assert(
  result.risk &&
  Number.isFinite(result.risk.score),
  'risk score missing'
);

console.log('PASS: Risk');

assert(
  result.forecast &&
  Array.isArray(result.forecast.projected),
  'forecast missing'
);

console.log('PASS: Forecast');

assert(
  result.decision &&
  result.decision.recommendation,
  'canonical decision missing'
);

console.log('PASS: Canonical decision');

assert.strictEqual(
  result.decision.status,
  'proposed',
  'decision must remain proposed'
);

assert.strictEqual(
  result.governance.approved,
  false,
  'decision must not auto-approve'
);

console.log('PASS: Governance remains unapproved');

assert(
  result.action &&
  result.action.type === 'construction:escalate_safety',
  'Construction action contract missing'
);

console.log('PASS: Domain action contract');

assert.strictEqual(
  result.action.status,
  'proposed',
  'action must remain proposed'
);

console.log('PASS: Action remains proposed');

assert(
  result.persistence &&
  result.persistence.persisted === true,
  'persistence contract missing'
);

console.log('PASS: Persistence');

assert(
  result.audit &&
  Array.isArray(result.audit.events),
  'audit contract missing'
);

console.log('PASS: Audit');

assert(
  result.verification &&
  result.verification.decision &&
  result.verification.decision.verified === true,
  'decision verification missing'
);

console.log('PASS: Verification');

assert(
  result.telemetry,
  'telemetry missing'
);

console.log('PASS: Telemetry');

console.log('');
console.log('CONSTRUCTION CONTROL PLANE: PASS');
