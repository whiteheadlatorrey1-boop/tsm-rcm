'use strict';
// Each adapted vertical: native result -> adapter -> envelope -> validateEnvelope
// -> runProductionControlPlane. Asserts the human gate survives end to end.
const { orchestrate } = require('../server/l1-copilot/governed-orchestrator');
const { validateEnvelope } = require('../server/vertical-control-plane/contract');
const { runProductionControlPlane } = require('../server/vertical-control-plane/production');
const l1 = require('../server/vertical-control-plane/adapters/l1-adapter');
const wf = require('../server/vertical-control-plane/adapters/workforce-adapter');

let passed = 0, failed = 0;
function check(n, ok) { if (ok) { passed++; console.log('PASS: ' + n); } else { failed++; console.log('FAIL: ' + n); } }

function lifecycle(name, env) {
  let valid = true;
  try { validateEnvelope(env); } catch (e) { valid = false; console.log('  ' + e.message); }
  check(name + ': envelope validates', valid);
  check(name + ': native decision requires approval', env.decisions.length >= 1 && env.decisions.every(d => d.requiresApproval === true));
  check(name + ': nothing pre-approved or executed',
    env.governance.approved === false &&
    env.decisions.every(d => d.executed !== true) &&
    env.actions.every(a => a.executed !== true));
  let prod = null, err = null;
  try { prod = runProductionControlPlane(env); } catch (e) { err = e; console.log('  ' + e.message); }
  check(name + ': runs through production without throwing', err === null);
  check(name + ': production decision is gated', !!prod && prod.decisions.length >= 1 && prod.decisions[0].requiresApproval === true);
  check(name + ': production decision has an id', !!prod && !!prod.decisions[0].id);
}

(async () => {
  const l1Input = {
    state: 'IN PROGRESS', taskType: 'HARDWARE',
    context: { number: 'SCTASK0010001', shortDescription: 'Prepare replacement laptop',
      description: 'Configure and test replacement device.', state: '2',
      assetTag: 'HW0001', requestedFor: 'Jane Doe', location: 'Phoenix' },
    evidence: {}
  };
  lifecycle('l1', l1.fromOrchestration(l1Input, await orchestrate(l1Input)));

  const view = {
    candidateId: 'cand-1', name: 'Test Candidate', readinessScore: 82, readinessBasis: 'assessment', isSampleData: false,
    signal: { signalId: 's1', type: 'readiness', value: 82, source: 'bridge' },
    insights: [{ type: 'ready', title: 'Ready', description: 'Meets threshold' }],
    actions: [{ type: 'review', title: 'Review placement', reason: 'score', requiresHumanReview: true }]
  };
  lifecycle('workforce', wf.fromReadiness({}, view, { eligible: true, reason: 'eligible', readinessScore: 82 }));
  lifecycle('workforce-ineligible', wf.fromReadiness({}, view, { eligible: false, reason: 'candidate-not-ready' }));

  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
