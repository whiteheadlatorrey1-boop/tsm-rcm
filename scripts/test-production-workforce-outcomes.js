'use strict';
const { fromReadiness } = require('../server/vertical-control-plane/adapters/workforce-adapter');
const { validateEnvelope } = require('../server/vertical-control-plane/contract');
const { runProductionControlPlane } = require('../server/vertical-control-plane/production');
let passed = 0, failed = 0;
function check(n, ok) { if (ok) { passed++; console.log('PASS: ' + n); } else { failed++; console.log('FAIL: ' + n); } }

const view = { candidateId: 'cand-1', name: 'Test', readinessScore: 82, readinessBasis: 'assessment', isSampleData: false,
  signal: { signalId: 's1', type: 'readiness', value: 82, source: 'bridge' },
  insights: [{ type: 'ready', title: 'Ready', description: 'ok' }],
  actions: [{ type: 'review', title: 'Review', reason: 'score', requiresHumanReview: true }] };
const el = { eligible: true, reason: 'eligible', readinessScore: 82 };
const evidence = [
  { placementEvidenceId: 'e1', eventType: 'SUBMITTED', stage: 'submitted', occurredAt: '2026-10-01T00:00:00Z', candidateId: 'cand-1', placementId: 'p1', jobOrderId: 'j1' },
  { placementEvidenceId: 'e2', eventType: 'PLACED', stage: 'placed', occurredAt: '2026-10-02T00:00:00Z', candidateId: 'cand-1', placementId: 'p1', jobOrderId: null }
];

check('no evidence -> outcomes empty', fromReadiness({}, view, el).outcomes.length === 0);
const env = fromReadiness({}, view, el, { evidence });
let valid = true; try { validateEnvelope(env); } catch (e) { valid = false; }
check('envelope with outcomes validates', valid);
check('two records -> two outcomes in order', env.outcomes.length === 2 && env.outcomes[0].stage === 'submitted' && env.outcomes[1].stage === 'placed');
check('outcome carries evidence id', env.outcomes[0].placementEvidenceId === 'e1');
check('outcomes do not loosen the gate', env.governance.approved === false && env.decisions.every(d => d.requiresApproval === true));
check('bad evidence input is ignored', fromReadiness({}, view, el, { evidence: 'x' }).outcomes.length === 0);
check('junk entries are skipped', fromReadiness({}, view, el, { evidence: [null, 5, evidence[0]] }).outcomes.length === 1);
let err = null, prod = null; try { prod = runProductionControlPlane(env); } catch (e) { err = e; }
check('production accepts envelope with outcomes and keeps gate', err === null && prod.decisions[0].requiresApproval === true);

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
