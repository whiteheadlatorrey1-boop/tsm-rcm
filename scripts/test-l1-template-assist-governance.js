'use strict';

const assert = require('assert');
const assistant = require('../server/l1-copilot/template-assistant');
const actionGate = require('../server/l1-copilot/action-gate');

console.log('==========================================');
console.log('PHASE 9.5 — TEMPLATE ASSIST GOVERNANCE');
console.log('==========================================');

const context = {
  shortDescription: 'Failed laptop needs replacement',
  description: 'Device failed and requires replacement.',
  fields: {
    INCIDENT_NUMBER: 'INC0090001',
    ASSET_TAG: 'HW0090',
    TECHNICIAN: 'TECH-902'
  }
};

const suggestion = assistant.prepareSuggestion(context);

assert.strictEqual(suggestion.templateId, 'DEVICE_REPLACEMENT');
assert.strictEqual(suggestion.technicianConfirmed, false);
assert.strictEqual(suggestion.executable, false);
assert.strictEqual(suggestion.renderedPreview, null);
console.log('PASS — AI suggestion is draft-only');

assert.strictEqual(suggestion.fields.INCIDENT_NUMBER, 'INC0090001');
assert.strictEqual(suggestion.fields.ASSET_TAG, 'HW0090');
assert.strictEqual(suggestion.fields.TECHNICIAN, 'TECH-902');
console.log('PASS — technician-supplied fields preserved');

let action = actionGate.generateAction({
  actionType: 'CREATE_REPLACEMENT',
  payload: {
    templateId: suggestion.templateId,
    fields: suggestion.fields
  },
  technician: {
    id: 'TECH-902',
    label: 'Phase 9 Technician'
  },
  sourceIncident: 'INC0090001'
});

assert.strictEqual(action.state, actionGate.STATES.GENERATED);
assert.strictEqual(action.confirmed, false);
console.log('PASS — suggestion does not authorize Action Gate');

(async () => {
  await assert.rejects(
    () => actionGate.executeAction(action, async () => ({
      executed: true
    })),
    err => err.code === 'INVALID_STATE_TRANSITION'
  );
  console.log('PASS — unconfirmed AI suggestion cannot execute');

  action = actionGate.previewAction(action);

  await assert.rejects(
    () => actionGate.executeAction(action, async () => ({
      executed: true
    })),
    err => err.code === 'INVALID_STATE_TRANSITION'
  );
  console.log('PASS — preview alone cannot execute');

  action = actionGate.confirmAction(action);

  assert.strictEqual(action.confirmed, true);
  assert.strictEqual(action.state, actionGate.STATES.CONFIRMED);
  console.log('PASS — execution requires explicit technician confirmation');

  const executed = await actionGate.executeAction(
    action,
    async () => ({
      authorized: true
    })
  );

  assert.strictEqual(executed.state, actionGate.STATES.EXECUTED);
  console.log('PASS — execution occurs only after confirmation');

  console.log('');
  console.log('PHASE 9.5 — ALL TESTS PASSED');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
