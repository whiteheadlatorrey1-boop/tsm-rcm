'use strict';
const { orchestrate } = require('../server/l1-copilot/governed-orchestrator');
const { createEnvelope, validateEnvelope } = require('../server/vertical-control-plane/contract');
const { runProductionControlPlane } = require('../server/vertical-control-plane/production');
const l1 = require('../server/vertical-control-plane/adapters/l1-adapter');
let passed = 0, failed = 0;
function check(n, ok) { if (ok) { passed++; console.log('PASS: ' + n); } else { failed++; console.log('FAIL: ' + n); } }

(async () => {
  check('envelope defaults outcomes to []', Array.isArray(createEnvelope({}).outcomes) && createEnvelope({}).outcomes.length === 0);

  const input = { state: 'IN PROGRESS', taskType: 'HARDWARE',
    context: { number: 'SCTASK0010001', shortDescription: 'Prepare replacement laptop', description: 'Configure and test.', state: '2', assetTag: 'HW0001', requestedFor: 'Jane Doe', location: 'Phoenix' },
    evidence: {} };
  const result = await orchestrate(input);

  const none = l1.fromOrchestration(input, result);
  check('no handoff -> outcomes empty', none.outcomes.length === 0);

  const handoff = { id: 'h-1', status: 'COMMITTED', technician: { id: 't1', label: 'Tech' },
    action: { actionType: 'ADD_WORK_NOTE', state: 'EXECUTED', confirmedAt: 'c', executedAt: 'e' },
    workPerformed: 'did it', validation: 'checked', blocker: null, ticketClosureRequested: false, createdAt: 'now' };
  const env = l1.fromOrchestration(input, result, { handoff });
  let valid = true; try { validateEnvelope(env); } catch (e) { valid = false; }
  check('envelope with outcome validates', valid);
  check('handoff mapped to one outcome', env.outcomes.length === 1 && env.outcomes[0].type === 'L1_HANDOFF' && env.outcomes[0].handoffId === 'h-1');
  check('outcome is not a closure', env.outcomes[0].ticketClosureRequested === false);
  check('outcome does not loosen the gate', env.governance.approved === false && env.decisions.every(d => d.requiresApproval === true));
  check('bad handoff input is ignored', l1.fromOrchestration(input, result, { handoff: 'x' }).outcomes.length === 0);
  let err = null; try { runProductionControlPlane(env); } catch (e) { err = e; }
  check('production accepts envelope with outcomes', err === null);

  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
