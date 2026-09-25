'use strict';
const gate = require('../../../server/l1-copilot/action-gate');

let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log('PASS:', name); } else { fail++; console.log('FAIL:', name); } }
async function checkThrows(name, code, fn) {
  try { await fn(); fail++; console.log('FAIL:', name, '(did not throw)'); }
  catch (e) { const ok = e.code === code; ok ? pass++ : fail++; console.log((ok ? 'PASS' : 'FAIL') + ':', name, ok ? '' : `(got ${e.code}: ${e.message})`); }
}

(async () => {
  const technician = { id: 'staff-1', label: 'A. Tech' };

  const a1 = gate.generateAction({ actionType: 'RESOLUTION_WRITE', payload: { note: 'x' }, technician, sourceIncident: 'INC0012345' });
  check('generateAction sets state GENERATED', a1.state === 'GENERATED');
  check('generateAction sets confirmed=false', a1.confirmed === false);

  await checkThrows('unknown actionType rejected', 'UNKNOWN_ACTION_TYPE', () =>
    gate.generateAction({ actionType: 'NUKE_EVERYTHING', technician }));

  await checkThrows('missing technician rejected', 'MISSING_TECHNICIAN', () =>
    gate.generateAction({ actionType: 'RESOLUTION_WRITE' }));

  await checkThrows('cannot confirm before preview', 'INVALID_STATE_TRANSITION', () =>
    gate.confirmAction(a1));

  const a2 = gate.previewAction(a1);
  check('previewAction sets state PREVIEWED', a2.state === 'PREVIEWED');

  const a3 = gate.confirmAction(a2);
  check('confirmAction sets state CONFIRMED', a3.state === 'CONFIRMED');
  check('confirmAction sets confirmed=true', a3.confirmed === true);
  check('confirmAction stamps confirmedAt', typeof a3.confirmedAt === 'string');

  const regenerated = gate.generateAction({ actionType: 'RESOLUTION_WRITE', payload: { note: 'changed' }, technician, sourceIncident: 'INC0012345' });
  check('regenerated action is not confirmed', regenerated.confirmed === false);
  check('regenerated action is state GENERATED', regenerated.state === 'GENERATED');

  await checkThrows('execute rejects a non-confirmed action', 'INVALID_STATE_TRANSITION', () =>
    gate.executeAction(a2, async () => ({ success: true })));

  await checkThrows('execute requires an executor function', 'MISSING_EXECUTOR', () =>
    gate.executeAction(a3, null));

  let executorCalledWith = null;
  const a4 = await gate.executeAction(a3, async (action) => { executorCalledWith = action; return { success: true, ticketId: 'INC0012345' }; });
  check('executeAction sets state EXECUTED', a4.state === 'EXECUTED');
  check('executeAction stamps executedAt', typeof a4.executedAt === 'string');
  check('executeAction stores executionResult', a4.executionResult && a4.executionResult.success === true);
  check('executor received the confirmed action', executorCalledWith && executorCalledWith.state === 'CONFIRMED');

  await checkThrows('cannot execute an already-executed action', 'INVALID_STATE_TRANSITION', () =>
    gate.executeAction(a4, async () => ({})));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
