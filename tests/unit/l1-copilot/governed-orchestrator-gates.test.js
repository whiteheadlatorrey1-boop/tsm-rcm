'use strict';
const assert = require('assert');
const actionGate = require('../../../server/l1-copilot/action-gate');
const { orchestrate } = require('../../../server/l1-copilot/governed-orchestrator');

let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log('PASS:', name); } else { fail++; console.log('FAIL:', name); } }

const technician = { id: 'staff-1', label: 'A. Tech' };
const generated = actionGate.generateAction({ actionType: 'RESOLUTION_WRITE', payload: { note: 'x' }, technician });
const previewed = actionGate.previewAction(generated);
const confirmed = actionGate.confirmAction(previewed);
const full = { userVerified: true, assetVerified: true, workConfirmed: true, tested: true, locationVerified: true, finalWorkNoteConfirmed: true };

let r = orchestrate({ state: 'IN PROGRESS', taskType: 'HARDWARE', evidence: {} });
check('no action -> ACTION_REQUIRED, not allowed', r.gates.execution.gate === 'ACTION_REQUIRED' && r.gates.execution.allowed === false);
check('gates.closure agrees with closure', r.gates.closure.readyForClosure === r.closure.readyForClosure && r.closure.readyForClosure === false);
check('existing output keys preserved', ['workflow', 'closure', 'checklist', 'context', 'evidence', 'governed'].every(k => k in r));

r = orchestrate({ state: 'IN PROGRESS', taskType: 'HARDWARE', evidence: full, action: previewed });
check('full evidence, previewed action -> closure ready, execution blocked', r.gates.closure.readyForClosure === true && r.gates.execution.allowed === false);

r = orchestrate({ state: 'IN PROGRESS', taskType: 'HARDWARE', evidence: {}, action: confirmed });
check('confirmed action, no evidence -> execution allowed, closure blocked', r.gates.execution.allowed === true && r.gates.closure.readyForClosure === false);

r = orchestrate({ state: 'IN PROGRESS', taskType: 'HARDWARE', evidence: {}, context: { reconciliation: { incident: { number: 'INC1' } } } });
check('reconciliation context never authorizes execution or closure', r.gates.execution.allowed === false && r.gates.closure.readyForClosure === false);

r = orchestrate({ state: 'IN PROGRESS', shortDescription: 'New hire onboarding', evidence: {} });
check('classified taskType flows into gates', r.gates.taskType === 'ONBOARDING' && r.gates.closure.taskType === 'ONBOARDING');

check('autonomous close stays disabled', r.gates.autonomousCloseAllowed === false && r.governed.autonomousCloseAllowed === false);

console.log(`\n${pass} passed, ${fail} failed`);
assert.strictEqual(fail, 0);
