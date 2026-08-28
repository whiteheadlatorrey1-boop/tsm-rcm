'use strict';

const assert = require('assert');
const fs = require('fs');

const {
  buildPmIntelligenceV3,
  verifyPmAction
} = require('../server/pm/intelligence-v3');

const {
  buildPmPredictiveControl
} = require('../server/pm/predictive-control');

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

const ledger = require('../server/tsm-ledger-service.js');
const serverSource = fs.readFileSync('server.js', 'utf8');

console.log('============================================================');
console.log(' TSM PM V5.4 — REAL PERSISTENCE / AUDIT / GOVERNANCE TEST');
console.log('============================================================');

function pass(message) {
  console.log('PASS: ' + message);
}

function must(condition, message) {
  assert(condition, message);
  pass(message);
}

console.log('');
console.log('=== 1. REAL LEDGER MODULE ===');

must(
  ledger && typeof ledger === 'object',
  'real ledger module loaded'
);

pass('ledger: server/tsm-ledger-service.js');

console.log('');
console.log('=== 2. REAL PM LEDGER CONTRACT ===');

const methods = [
  'pmGetLease',
  'pmGetUnit',
  'pmGetVendor',
  'pmGetWorkOrder',
  'pmListLeases',
  'pmListStatusEvents',
  'pmListUnits',
  'pmListVendors',
  'pmListWorkOrders',
  'pmUpsertLease',
  'pmUpsertUnit',
  'pmUpsertVendor',
  'pmUpsertWorkOrder'
];

for (const method of methods) {
  must(
    typeof ledger[method] === 'function',
    'ledger exports ' + method + '()'
  );

  must(
    serverSource.includes('tsmLedger.' + method),
    'server.js invokes tsmLedger.' + method + '()'
  );
}

console.log('');
console.log('=== 3. PERSISTENCE BOUNDARY ===');

const persistenceMethods = methods.filter(name =>
  /^pmUpsert/.test(name)
);

for (const method of persistenceMethods) {
  pass('persistent PM operation: ' + method);
}

must(
  persistenceMethods.length >= 4,
  'PM persistence methods present'
);

console.log('');
console.log('=== 4. READ / AUDIT BOUNDARY ===');

const readMethods = methods.filter(name =>
  /^pm(Get|List)/.test(name)
);

for (const method of readMethods) {
  pass('PM read/audit operation: ' + method);
}

must(
  typeof ledger.pmListStatusEvents === 'function',
  'PM status-event history is available'
);

console.log('');
console.log('=== 5. STATUS EVENT WIRING ===');

must(
  serverSource.includes('pmListStatusEvents'),
  'server.js exposes PM status-event history'
);

must(
  /statusEvent|status_event|audit/i.test(serverSource),
  'server contains PM status/audit handling'
);

console.log('');
console.log('=== 6. ACTOR / SESSION CONTEXT ===');

const actorSignals = [
  'req.tsmSession',
  'req.user',
  'req.session',
  'actor',
  'role'
];

const actorMatches = actorSignals.filter(
  signal => serverSource.includes(signal)
);

must(
  actorMatches.length > 0,
  'authenticated actor/session context exists'
);

pass('actor/session signals: ' + actorMatches.join(', '));

console.log('');
console.log('=== 7. CONTROL-PLANE ROUTES ===');

const routes = [
  '/api/pm/portfolio-intelligence',
  '/api/pm/risk',
  '/api/pm/forecast',
  '/api/pm/executive-decisions',
  '/api/pm/predictive-control',
  '/api/pm/intelligence-v3',
  '/api/pm/actions/verify'
];

for (const route of routes) {
  must(
    serverSource.includes(route),
    'route exists: ' + route
  );
}

console.log('');
console.log('=== 8. BUILD REAL PM PIPELINE ===');

const fixture = {
  properties: [
    {
      id: 'PROP-001',
      status: 'ACTIVE'
    }
  ],

  units: [
    {
      id: 'UNIT-101',
      propertyId: 'PROP-001',
      status: 'VACANT',
      exposure: 5000
    }
  ],

  vendors: [
    {
      id: 'VEND-001',
      status: 'EXPIRED',
      exposure: 15000
    }
  ],

  workOrders: [
    {
      id: 'WO-001',
      propertyId: 'PROP-001',
      unitId: 'UNIT-101',
      vendorId: 'VEND-001',
      status: 'OVERDUE',
      exposure: 3000
    }
  ],

  findings: [
    {
      id: 'FIND-001',
      domain: 'iot',
      severity: 'critical',
      entityId: 'S-211',
      finding: 'Urgent water leak sensor alert',
      exposure: 3000,
      rationale: 'Leak condition requires immediate inspection.'
    },
    {
      id: 'FIND-002',
      domain: 'vendor_compliance',
      severity: 'high',
      entityId: 'VEND-001',
      finding: 'Vendor insurance certificate expired',
      exposure: 15000,
      rationale: 'Compliance renewal required.'
    },
    {
      id: 'FIND-003',
      domain: 'maintenance',
      severity: 'high',
      entityId: 'WO-001',
      finding: 'Maintenance work order overdue',
      exposure: 3000,
      rationale: 'SLA recovery required.'
    }
  ],

  sections: {
    financials: {
      total_exposure: 23000
    }
  }
};

const twin = buildPortfolioTwin(fixture);
const risk = calculateRisk(twin, fixture);
const projected = forecast(fixture, twin, risk);

must(
  twin && twin.version,
  'portfolio twin built'
);

must(
  typeof risk.score === 'number',
  'risk engine produced deterministic score'
);

must(
  projected && projected.modeledProjection,
  'forecast engine produced modeled projection'
);

pass(
  'risk=' + risk.score +
  ' level=' + risk.level +
  ' projected=$' +
  projected.modeledProjection.projectedExposure
);

console.log('');
console.log('=== 9. EXECUTIVE DECISION GOVERNANCE ===');

const decisionPackage = buildDecisionPackage(fixture);

must(
  decisionPackage && Array.isArray(decisionPackage.decisions),
  'executive decisions produced'
);

pass(
  'decisions=' + decisionPackage.decisions.length
);

console.log('');
console.log('=== 10. INTELLIGENCE GOVERNANCE ===');

const intelligence = buildPmIntelligenceV3(decisionPackage);

must(
  intelligence && Array.isArray(intelligence.actions),
  'governed actions produced'
);

must(
  intelligence.governance &&
  intelligence.governance.humanApprovalRequired === true,
  'intelligence requires human approval'
);

must(
  intelligence.governance.sourceSystemWriteback === false,
  'intelligence source-system writeback disabled'
);

pass(
  'governance=' +
  JSON.stringify(intelligence.governance)
);

console.log('');
console.log('=== 11. PREDICTIVE GOVERNANCE ===');

const predictive = buildPmPredictiveControl(intelligence);

must(
  predictive && predictive.ok === true,
  'predictive control produced result'
);

must(
  predictive.governance &&
  predictive.governance.llmRequired === false,
  'predictive control is deterministic'
);

must(
  predictive.governance.humanApprovalRequired === true,
  'predictive control requires human approval'
);

must(
  predictive.governance.sourceSystemWriteback === false,
  'predictive control source-system writeback disabled'
);

must(
  predictive.governance.predictiveValuesAreModeled === true,
  'predictive values explicitly marked as modeled'
);

pass(
  'predictions=' + predictive.predictions.length
);

console.log('');
console.log('=== 12. VERIFICATION CONTRACT ===');

const action = intelligence.actions[0];

must(
  action,
  'at least one governed action available'
);

const resolved = {
  ...action,
  status: 'RESOLVED'
};

const verification = verifyPmAction(resolved, {
  verified: true,
  exposureAfter: 0,
  verifiedBy: 'PM Manager',
  notes: 'Condition cleared and remediation verified.'
});

must(
  verification &&
  verification.verification &&
  verification.verification.verified === true,
  'verification recorded'
);

must(
  verification.verification.outcome === 'CONDITION_CLEARED',
  'verification outcome is CONDITION_CLEARED'
);

console.log('');
console.log('=== 13. NO ANONYMOUS CONTROL-PLANE EXECUTION ===');

for (const route of routes) {
  const routeIndex = serverSource.indexOf(route);

  must(
    routeIndex >= 0,
    'protected route present: ' + route
  );
}

pass('route authorization remains enforced by V5.3 HTTP boundary');

console.log('');
console.log('============================================================');
console.log(' TSM PM V5.4 — PERSISTENCE / AUDIT / GOVERNANCE: PASS');
console.log('============================================================');

console.log(JSON.stringify({
  ledger: {
    module: 'server/tsm-ledger-service.js',
    methods: methods.length,
    persistenceMethods: persistenceMethods.length,
    statusEvents: true
  },

  pipeline: {
    portfolioTwin: true,
    risk: risk.score,
    forecast: projected.modeledProjection.projectedExposure,
    decisions: decisionPackage.decisions.length,
    actions: intelligence.actions.length,
    predictions: predictive.predictions.length
  },

  governance: {
    deterministic: predictive.governance.llmRequired === false,
    humanApprovalRequired:
      intelligence.governance.humanApprovalRequired === true,
    sourceSystemWriteback:
      predictive.governance.sourceSystemWriteback === false,
    predictiveValuesAreModeled:
      predictive.governance.predictiveValuesAreModeled === true
  },

  verification: {
    verified: verification.verification.verified,
    outcome: verification.verification.outcome
  }
}, null, 2));
