'use strict';

const { orchestrate } = require('../server/l1-copilot/governed-orchestrator');
const { validateEnvelope, CONTROL_PLANE_VERSION } = require('../server/vertical-control-plane/contract');
const { fromOrchestration } = require('../server/vertical-control-plane/adapters/l1-adapter');

let passed = 0;
let failed = 0;
function check(label, cond) {
  if (cond) { console.log(`PASS: ${label}`); passed++; } else { console.log(`FAIL: ${label}`); failed++; }
}

(async () => {
  console.log('=== L1 -> CANONICAL ENVELOPE ADAPTER TEST ===');

  const input = {
    state: 'IN PROGRESS',
    taskType: 'HARDWARE',
    context: {
      number: 'SCTASK0010001',
      shortDescription: 'Prepare replacement laptop',
      description: 'Configure and test replacement device.',
      state: '2',
      assetTag: 'HW0001',
      requestedFor: 'Jane Doe',
      location: 'Phoenix'
    },
    evidence: {}
  };
  const inputBefore = JSON.stringify(input);
  const result = await orchestrate(input);
  const resultBefore = JSON.stringify(result);
  const env = fromOrchestration(input, result);

  let valid = true;
  try { validateEnvelope(env); } catch (e) { valid = false; console.log(e.message); }
  check('envelope passes validateEnvelope()', valid);
  check('schemaVersion matches contract', env.schemaVersion === CONTROL_PLANE_VERSION);
  check('vertical is l1', env.vertical === 'l1');
  check('entities include task, asset, person',
    ['TASK', 'ASSET', 'PERSON'].every((t) => env.entities.some((e) => e.type === t)));
  check('relationships link task to asset and person', env.relationships.length === 2);
  check('findings mirror missing closure evidence',
    env.findings.length > 0 && env.findings.length === env.verification.missingEvidence.length);
  check('findings include userVerified', env.findings.some((f) => f.key === 'userVerified'));
  check('approval required and not approved', env.governance.approvalRequired === true && env.governance.approved === false);
  check('technician authority preserved from orchestrator', env.governance.technicianAuthority === true);
  check('autonomous close not allowed', env.governance.autonomousCloseAllowed === false);
  check('writeback blocked', env.writeback.allowed === false && env.writeback.executed === false);
  check('not ready for closure with empty evidence', env.verification.readyForClosure === false);
  check('checklist carried into verification', env.verification.checklist.length > 0);
  check('adapter did not mutate input', JSON.stringify(input) === inputBefore);
  check('adapter did not mutate orchestrator result', JSON.stringify(result) === resultBefore);

  // Synthetic result (not from the orchestrator): ready-for-closure must still never self-approve.
  const ready = fromOrchestration(input, {
    gates: { closure: { gate: 'READY', readyForClosure: true, missingEvidence: [] }, execution: { gate: 'ACTION_REQUIRED', allowed: true } }
  });
  check('synthetic ready result: findings empty', ready.findings.length === 0);
  check('synthetic ready result: still not approved', ready.governance.approved === false);
  check('synthetic ready result: writeback still blocked', ready.writeback.allowed === false);

  let emptyOk = true;
  try { validateEnvelope(fromOrchestration()); } catch (e) { emptyOk = false; }
  check('no-arg call still yields a valid envelope', emptyOk);

  check('decisions carries closure readiness', env.decisions.length === 1 && env.decisions[0].type === 'CLOSURE_READINESS' && env.decisions[0].readyForClosure === false);
  check('closure decision requires approval', env.decisions[0].requiresApproval === true);
  check('synthetic ready result: closure decision still requires approval', ready.decisions.length === 1 && ready.decisions[0].requiresApproval === true);
  console.log('NOTE: exposures is empty. The L1 orchestrator emits no exposure concept.');
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
