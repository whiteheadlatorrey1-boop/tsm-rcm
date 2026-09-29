'use strict';
const assert = require('assert');
const gate = require('../../../server/l1-copilot/action-gate');
const engine = require('../../../server/l1-copilot/workflow-engine');
const closure = require('../../../server/l1-copilot/closure-gate');
const tracker = require('../../../server/l1-copilot/gate-tracker');

let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log('PASS:', name); } else { fail++; console.log('FAIL:', name); } }

function deepFreeze(o) {
  Object.values(o).forEach(v => { if (v && typeof v === 'object') deepFreeze(v); });
  return Object.freeze(o);
}
function fullEvidence(taskType) {
  const e = {};
  engine.getRequiredEvidence(taskType).forEach(r => { e[r.key] = true; });
  return e;
}

(async () => {
  const technician = { id: 'staff-1', label: 'A. Tech' };
  const generated = gate.generateAction({ actionType: 'RESOLUTION_WRITE', payload: { note: 'x' }, technician, sourceIncident: 'INC0012345' });
  const previewed = gate.previewAction(generated);
  const confirmed = gate.confirmAction(previewed);
  const executed = await gate.executeAction(confirmed, async () => ({ ok: true }));

  // ---- execution track (reads action-gate state) ----
  let r = tracker.evaluateExecutionGate(null);
  check('no action -> ACTION_REQUIRED, not allowed', r.gate === 'ACTION_REQUIRED' && r.allowed === false);

  r = tracker.evaluateExecutionGate(generated);
  check('GENERATED -> ACTION_PREVIEW, not allowed', r.gate === 'ACTION_PREVIEW' && r.allowed === false);

  r = tracker.evaluateExecutionGate(previewed);
  check('PREVIEWED -> TECHNICIAN_CONFIRMATION, not allowed', r.gate === 'TECHNICIAN_CONFIRMATION' && r.allowed === false);

  r = tracker.evaluateExecutionGate(confirmed);
  check('CONFIRMED -> EXECUTION_AUTHORIZED, allowed', r.gate === 'EXECUTION_AUTHORIZED' && r.allowed === true);

  r = tracker.evaluateExecutionGate(executed);
  check('EXECUTED -> ALREADY_EXECUTED, not allowed', r.gate === 'ALREADY_EXECUTED' && r.allowed === false);

  r = tracker.evaluateExecutionGate({ ...confirmed, confirmed: false });
  check('CONFIRMED state without confirmed=true -> INVALID_ACTION, not allowed', r.gate === 'INVALID_ACTION' && r.allowed === false);

  r = tracker.evaluateExecutionGate({ ...generated, state: 'BOGUS' });
  check('unknown action state -> INVALID_ACTION, not allowed', r.gate === 'INVALID_ACTION' && r.allowed === false);

  const withRefs = gate.generateAction({
    actionType: 'RESOLUTION_WRITE', technician,
    references: { incident: { number: 'INC1', sysId: 's1' }, asset: { assetTag: 'HW1', sysId: 'a1' } }
  });
  check('references never authorize execution', tracker.evaluateExecutionGate(withRefs).allowed === false);

  const regenerated = gate.generateAction({ actionType: 'RESOLUTION_WRITE', payload: { note: 'changed' }, technician });
  check('regenerating an action after confirmation is not authorized', tracker.evaluateExecutionGate(regenerated).allowed === false);

  // ---- closure track (wraps closure-gate) ----
  let c = tracker.evaluateClosureGate({ state: 'OPEN', taskType: 'HARDWARE', evidence: fullEvidence('HARDWARE') });
  check('OPEN with full evidence -> WORKFLOW_STATE, not ready', c.gate === 'WORKFLOW_STATE' && c.readyForClosure === false);

  c = tracker.evaluateClosureGate({ state: 'in_progress', taskType: 'HARDWARE', evidence: {} });
  check('IN PROGRESS, no evidence -> EVIDENCE, first key userVerified', c.gate === 'EVIDENCE' && c.nextEvidence === 'userVerified');

  c = tracker.evaluateClosureGate({ state: 'IN PROGRESS', taskType: 'FOOT MOVE', evidence: { userVerified: true, assetVerified: true, workConfirmed: true, tested: true, finalWorkNoteConfirmed: true } });
  check('FOOT MOVE requires locationVerified', c.gate === 'EVIDENCE' && c.missingEvidence.some(m => m.key === 'locationVerified'));

  c = tracker.evaluateClosureGate({ state: 'IN PROGRESS', taskType: 'HARDWARE', evidence: fullEvidence('HARDWARE') });
  check('HARDWARE with full evidence -> CLOSE_READY', c.gate === 'CLOSE_READY' && c.readyForClosure === true && c.nextEvidence === null);

  c = tracker.evaluateClosureGate({ state: 'IN PROGRESS', shortDescription: 'New hire onboarding', evidence: {} });
  check('taskType is classified from description when not explicit', c.taskType === 'ONBOARDING');

  // ---- cross-task invariant: tracker agrees with closure-gate for every task type ----
  let agree = true;
  for (const t of engine.TASK_TYPES) {
    const ev = fullEvidence(t);
    const tr = tracker.evaluateClosureGate({ state: 'IN PROGRESS', taskType: t, evidence: ev });
    const cg = closure.evaluateClosure({ state: 'IN PROGRESS', taskType: t, evidence: ev });
    if (!(tr.readyForClosure === true && cg.readyForClosure === true && tr.missingEvidence.length === 0)) agree = false;
    const none = tracker.evaluateClosureGate({ state: 'IN PROGRESS', taskType: t, evidence: {} });
    if (none.readyForClosure !== false || none.missingEvidence.length !== engine.getRequiredEvidence(t).length) agree = false;
  }
  check('all task types: full evidence -> ready, empty evidence -> all missing, matches closure-gate', agree);

  // ---- independence and authority ----
  let g = tracker.evaluateGates({ state: 'IN PROGRESS', taskType: 'HARDWARE', evidence: {}, action: confirmed });
  check('confirmed action does not make closure ready', g.execution.allowed === true && g.closure.readyForClosure === false);

  g = tracker.evaluateGates({ state: 'IN PROGRESS', taskType: 'HARDWARE', evidence: fullEvidence('HARDWARE'), action: previewed });
  check('full evidence does not authorize execution', g.closure.readyForClosure === true && g.execution.allowed === false);

  check('never allows autonomous close; technician stays authority', g.autonomousCloseAllowed === false && g.technicianAuthority === true);

  // ---- purity ----
  let mutated = false;
  try {
    const frozen = deepFreeze({ state: 'IN PROGRESS', taskType: 'HARDWARE', evidence: fullEvidence('HARDWARE'), action: { ...confirmed, references: { a: 1 } } });
    tracker.evaluateGates(frozen);
  } catch (e) { mutated = true; }
  check('does not mutate frozen inputs', mutated === false);

  const a = tracker.evaluateClosureGate({ state: 'IN PROGRESS', taskType: 'HARDWARE', evidence: {} });
  a.missingEvidence.push({ key: 'x' });
  const b = tracker.evaluateClosureGate({ state: 'IN PROGRESS', taskType: 'HARDWARE', evidence: {} });
  check('returned arrays are not shared between calls', b.missingEvidence.every(m => m.key !== 'x'));

  console.log(`\n${pass} passed, ${fail} failed`);
  assert.strictEqual(fail, 0);
})().catch(e => { console.error(e); process.exit(1); });
