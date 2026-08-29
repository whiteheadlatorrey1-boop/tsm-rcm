'use strict';

const assert = require('assert');

const {
  VERTICAL,
  normalizeHealthcareDomain,
  buildPredictions,
  selectAction,
  runHealthcareControlPlane
} = require('../server/healthcare/healthcare-control-plane');

console.log('=== HEALTHCARE CONTROL PLANE TEST ===');

const input = {
  domain: {
    portfolio: {
      organization: 'TSM Healthcare',
      specialty: 'Revenue Cycle Management'
    },

    nodes: [
      {
        id: 'hc-node-001',
        status: 'critical',
        message: 'Denial escalation threshold exceeded'
      }
    ],

    findings: [
      {
        id: 'hc-finding-001',
        severity: 'critical',
        title: 'High-value denial exposure'
      },
      {
        id: 'hc-finding-002',
        severity: 'high',
        title: 'Authorization backlog'
      }
    ],

    risks: [
      {
        id: 'hc-risk-001',
        severity: 'high',
        title: 'Revenue leakage exposure'
      }
    ]
  }
};

const domain = normalizeHealthcareDomain(input);

assert.strictEqual(
  domain.vertical,
  'healthcare'
);
console.log('PASS: Healthcare domain normalization');

assert.strictEqual(
  domain.findings.length,
  2
);
console.log('PASS: Healthcare findings');

assert.strictEqual(
  domain.nodes.length,
  1
);
console.log('PASS: Healthcare node exposure');

const predictions = buildPredictions(domain);

assert.ok(
  predictions.length >= 2
);
console.log('PASS: Healthcare predictions');

assert.strictEqual(
  selectAction(domain),
  'escalate-healthcare-risk'
);
console.log('PASS: Domain action selection');

const result = runHealthcareControlPlane(input);

assert.strictEqual(
  result.vertical,
  'healthcare'
);
console.log('PASS: Control-plane vertical');

assert.ok(
  Array.isArray(result.decisions)
);
console.log('PASS: Canonical decisions');

assert.ok(
  result.decision
);
console.log('PASS: Singular decision contract');

assert.ok(
  Array.isArray(result.actions)
);
console.log('PASS: Canonical actions');

assert.ok(
  result.action
);
console.log('PASS: Singular action contract');

assert.ok(
  result.risk !== undefined
);
console.log('PASS: Risk');

assert.ok(
  result.forecast !== undefined
);
console.log('PASS: Forecast');

assert.ok(
  result.governance !== undefined
);
console.log('PASS: Governance');

assert.ok(
  result.persistence !== undefined ||
  result.persisted !== undefined
);
console.log('PASS: Persistence');

assert.ok(
  result.audit !== undefined
);
console.log('PASS: Audit');

assert.ok(
  result.verification !== undefined
);
console.log('PASS: Verification');

assert.ok(
  result.telemetry !== undefined
);
console.log('PASS: Telemetry');

console.log('');
console.log('HEALTHCARE CONTROL PLANE: PASS');
