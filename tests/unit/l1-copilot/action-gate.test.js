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

  const reconciliationReferences = {
    incident: { number: 'INC0010001', sysId: 'incident-sys-1' },
    ritm: { number: 'RITM0010001', sysId: 'ritm-sys-1' },
    sctask: { number: 'SCTASK0010001', sysId: 'sctask-sys-1' },
    asset: { assetTag: 'HW0001', sysId: 'asset-sys-1' }
  };

  const referencedAction = gate.generateAction({
    actionType: 'RESOLUTION_WRITE',
    payload: { note: 'validated resolution' },
    technician,
    sourceIncident: 'INC0010001',
    references: reconciliationReferences
  });

  check(
    'references preserve Incident context',
    referencedAction.references &&
      referencedAction.references.incident &&
      referencedAction.references.incident.number === 'INC0010001'
  );

  check(
    'references preserve RITM context',
    referencedAction.references &&
      referencedAction.references.ritm &&
      referencedAction.references.ritm.number === 'RITM0010001'
  );

  check(
    'references preserve SC Task context',
    referencedAction.references &&
      referencedAction.references.sctask &&
      referencedAction.references.sctask.number === 'SCTASK0010001'
  );

  check(
    'references preserve asset context',
    referencedAction.references &&
      referencedAction.references.asset &&
      referencedAction.references.asset.assetTag === 'HW0001'
  );

  check(
    'reference preservation does not confirm action',
    referencedAction.confirmed === false &&
      referencedAction.state === 'GENERATED'
  );

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
