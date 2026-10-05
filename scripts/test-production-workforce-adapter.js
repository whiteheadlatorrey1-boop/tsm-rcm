'use strict';
const { fromReadiness } = require('../server/vertical-control-plane/adapters/workforce-adapter');
const { runProductionControlPlane } = require('../server/vertical-control-plane/production');
let passed = 0, failed = 0;
function check(n, ok) { if (ok) { passed++; console.log('  ok  ' + n); } else { failed++; console.log('  FAIL ' + n); } }

const view = {
  candidateId: 'cand-1', name: 'Test Candidate', readinessScore: 82, readinessBasis: 'assessment', isSampleData: false,
  signal: { signalId: 's1', type: 'readiness', value: 82, source: 'bridge' },
  insights: [{ type: 'ready', title: 'Ready', description: 'Meets threshold' }],
  actions: [{ type: 'review', title: 'Review placement', reason: 'score', requiresHumanReview: true }]
};
const eligible = { eligible: true, reason: 'eligible', readinessScore: 82 };
const notReady = { eligible: false, reason: 'candidate-not-ready', status: 'in_training' };

const env = fromReadiness({}, view, eligible);
check('vertical is workforce', env.vertical === 'workforce');
check('candidate entity present', env.entities.length === 1 && env.entities[0].id === 'cand-1');
check('signal carried as event', env.events.length === 1 && env.events[0].type === 'READINESS_SIGNAL');
check('decisions[] has one eligibility entry', env.decisions.length === 1 && env.decisions[0].type === 'PLACEMENT_ELIGIBILITY');
check('eligible decision still requires approval', env.decisions[0].requiresApproval === true && env.decisions[0].executed === false);
check('governance unapproved', env.governance.approvalRequired === true && env.governance.approved === false);
check('actions never allowed or executed', env.actions.every(a => a.allowed === false && a.executed === false));

const bad = fromReadiness({}, view, notReady);
check('ineligible adds a finding with the reason', bad.findings.some(f => f.type === 'PLACEMENT_INELIGIBLE' && f.reason === 'candidate-not-ready'));
check('ineligible decision also requires approval', bad.decisions[0].eligible === false && bad.decisions[0].requiresApproval === true);

const empty = fromReadiness({}, null, null);
check('empty input does not throw and is gated', empty.decisions.length === 1 && empty.governance.approved === false);

const prod = runProductionControlPlane(env);
check('production gate holds for eligible candidate', prod.decisions[0].requiresApproval === true);

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
