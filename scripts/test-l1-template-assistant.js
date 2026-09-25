'use strict';

const assert = require('assert');

const assistant = require('../server/l1-copilot/template-assistant');

let passed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS — ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL — ${name}`);
    console.error(err.message);
    process.exit(1);
  }
}

console.log('==========================================');
console.log('PHASE 9.2 — TEMPLATE ASSISTANT');
console.log('==========================================');

test('replacement signal suggests DEVICE_REPLACEMENT', () => {
  const result = assistant.suggestTemplate({
    shortDescription: 'Failed laptop needs replacement'
  });

  assert.strictEqual(result.suggested, true);
  assert.strictEqual(result.templateId, 'DEVICE_REPLACEMENT');
});

test('hardware swap signal suggests HARDWARE_SWAP', () => {
  const result = assistant.suggestTemplate({
    shortDescription: 'Perform hardware swap'
  });

  assert.strictEqual(result.templateId, 'HARDWARE_SWAP');
});

test('loaner signal suggests LOANER_RETURN', () => {
  const result = assistant.suggestTemplate({
    description: 'User returned loaner laptop'
  });

  assert.strictEqual(result.templateId, 'LOANER_RETURN');
});

test('unknown context produces no suggestion', () => {
  const result = assistant.suggestTemplate({
    shortDescription: 'Investigate network issue'
  });

  assert.strictEqual(result.suggested, false);
  assert.strictEqual(result.templateId, null);
  assert.strictEqual(result.executable, false);
});

test('technician fields are preserved exactly', () => {
  const result = assistant.prepareSuggestion({
    shortDescription: 'Replace failed device',
    fields: {
      INCIDENT_NUMBER: 'INC0010001',
      ASSET_TAG: 'HW0001',
      TECHNICIAN: 'TECH-9'
    }
  });

  assert.strictEqual(result.fields.INCIDENT_NUMBER, 'INC0010001');
  assert.strictEqual(result.fields.ASSET_TAG, 'HW0001');
  assert.strictEqual(result.fields.TECHNICIAN, 'TECH-9');
});

test('assistant never marks suggestion confirmed', () => {
  const result = assistant.prepareSuggestion({
    shortDescription: 'Replace failed device'
  });

  assert.strictEqual(result.technicianConfirmed, false);
});

test('assistant never marks suggestion executable', () => {
  const result = assistant.prepareSuggestion({
    shortDescription: 'Replace failed device'
  });

  assert.strictEqual(result.executable, false);
});

test('assistant does not render partial template', () => {
  const result = assistant.prepareSuggestion({
    shortDescription: 'Replace failed device',
    fields: {
      INCIDENT_NUMBER: 'INC0010001'
    }
  });

  assert.strictEqual(result.renderedPreview, null);
});

console.log('');
console.log(`PHASE 9.2 — ${passed}/8 TESTS PASSED`);
