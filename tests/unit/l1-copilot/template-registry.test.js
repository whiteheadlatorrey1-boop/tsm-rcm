'use strict';
const assert = require('assert');
const { listTemplates, renderTemplate } = require('../../../server/l1-copilot/template-registry');

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); pass++; console.log('PASS:', name); }
  catch (e) { fail++; console.log('FAIL:', name, '-', e.message); }
}

const IDS = ['RETURN_TO_INVENTORY', 'DEVICE_REPLACEMENT', 'HARDWARE_SWAP',
             'LOANER_RETURN', 'WARRANTY_DEPOT_RETURN', 'DEVICE_REASSIGNMENT'];
const FULL = {
  INCIDENT_NUMBER: 'INC0012345', ASSET_TAG: 'A-1001', MANUFACTURER: 'Dell', MODEL: 'Latitude 5540',
  ASSIGNED_USER: 'jdoe', TECHNICIAN: 'A. Tech', RETURN_REASON: 'Employee departure',
  TECHNICIAN_NOTES: 'Wiped and tagged'
};

check('registry contains the 6 core lifecycle templates', () => {
  const ids = listTemplates().map(t => t.id);
  for (const id of IDS) assert.ok(ids.includes(id), 'missing ' + id);
});

check('listTemplates returns copies (callers cannot mutate the registry)', () => {
  const t = listTemplates()[0]; t.required.push('HACK');
  assert.ok(!listTemplates()[0].required.includes('HACK'));
});

for (const id of IDS) {
  check(`${id}: renders when every declared field is supplied`, () => {
    const r = renderTemplate(id, FULL);
    assert.strictEqual(r.templateId, id);
    assert.ok(r.body.startsWith('[') && r.body.includes('Incident: INC0012345'));
  });

  check(`${id}: each required field, when blank, throws MISSING_REQUIRED_FIELDS naming it`, () => {
    const tpl = listTemplates().find(t => t.id === id);
    for (const name of tpl.required) {
      const ctx = { ...FULL, [name]: '   ' };
      assert.throws(() => renderTemplate(id, ctx),
        e => e.code === 'MISSING_REQUIRED_FIELDS' && e.missing.includes(name));
    }
  });

  check(`${id}: absent optional fields are omitted, never invented`, () => {
    const tpl = listTemplates().find(t => t.id === id);
    const ctx = {}; tpl.required.forEach(n => { ctx[n] = FULL[n]; });
    const body = renderTemplate(id, ctx).body;
    for (const opt of tpl.optional) assert.ok(!body.includes(FULL[opt]) || tpl.required.includes(opt));
    assert.strictEqual(body.split('\n').length, 1 + tpl.required.length);
  });
}

check('unknown template throws UNKNOWN_TEMPLATE', () => {
  assert.throws(() => renderTemplate('DISPOSE_DEVICE', FULL), e => e.code === 'UNKNOWN_TEMPLATE');
});

check('undeclared context keys are never substituted', () => {
  const r = renderTemplate('RETURN_TO_INVENTORY', { ...FULL, EVIL: 'injected-value', __proto__x: 'p' });
  assert.ok(!r.body.includes('injected-value'));
});

check('null/undefined context is treated as empty (throws missing, not a crash)', () => {
  assert.throws(() => renderTemplate('HARDWARE_SWAP', null), e => e.code === 'MISSING_REQUIRED_FIELDS');
  assert.throws(() => renderTemplate('HARDWARE_SWAP'), e => e.code === 'MISSING_REQUIRED_FIELDS');
});

check('values are trimmed', () => {
  const r = renderTemplate('LOANER_RETURN', { ...FULL, ASSET_TAG: '  A-1001  ' });
  assert.ok(r.body.includes('Asset Tag: A-1001'));
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
