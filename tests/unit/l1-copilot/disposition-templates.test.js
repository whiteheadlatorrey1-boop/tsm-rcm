'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const registry = require('../../../server/l1-copilot/template-registry');
const gate = require('../../../server/l1-copilot/action-gate');
const { assessDisposition } = require('../../../server/l1-copilot/asset-lifecycle');

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); } catch (e) { console.error(`FAIL ${name}`); throw e; }
}

const STAGES = ['DISPOSITION_RECOMMENDATION', 'DISPOSITION_APPROVAL', 'DISPOSITION_SANITIZATION', 'DISPOSITION_COMPLETION'];
const common = { INCIDENT_NUMBER: 'INC0012345', ASSET_TAG: 'A1', TECHNICIAN: 'tech1' };
const stageCtx = {
  DISPOSITION_RECOMMENDATION: { WARRANTY_STATUS: 'OUT_OF_WARRANTY', CONDITION: 'NON_FUNCTIONAL', RECOMMENDATION_REASONS: 'Out of warranty and non-functional.' },
  DISPOSITION_APPROVAL: { APPROVER: 'J. Smith', APPROVAL_REFERENCE: 'APR-1001' },
  DISPOSITION_SANITIZATION: { SANITIZATION_METHOD: 'NIST 800-88 Purge', SANITIZATION_VERIFIED_BY: 'tech2' },
  DISPOSITION_COMPLETION: { DISPOSITION_METHOD: 'Certified recycler', DISPOSITION_REFERENCE: 'CERT-77' }
};

test('all four disposition stages are registered and render', () => {
  const ids = registry.listTemplates().map(t => t.id);
  for (const id of STAGES) {
    assert.ok(ids.includes(id), id);
    const r = registry.renderTemplate(id, { ...common, ...stageCtx[id] });
    assert.ok(r.body.startsWith('[DISPOSITION'));
  }
});

test('each stage refuses to render without its human-supplied fields', () => {
  for (const id of STAGES.slice(1)) {
    for (const missing of Object.keys(stageCtx[id])) {
      const ctx = { ...common, ...stageCtx[id] };
      delete ctx[missing];
      assert.throws(() => registry.renderTemplate(id, ctx),
        e => e.code === 'MISSING_REQUIRED_FIELDS' && e.missing.includes(missing));
    }
  }
});

test('approval record cannot be rendered without an approver identity', () => {
  assert.throws(() => registry.renderTemplate('DISPOSITION_APPROVAL', { ...common, APPROVER: '  ', APPROVAL_REFERENCE: 'x' }),
    e => e.code === 'MISSING_REQUIRED_FIELDS');
});

test('every disposition template has an action type in the gate and the server route map', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../../server.js'), 'utf8');
  const map = src.slice(src.indexOf('const TEMPLATE_TO_ACTION_TYPE'), src.indexOf('};', src.indexOf('const TEMPLATE_TO_ACTION_TYPE')));
  for (const id of STAGES) {
    assert.ok(gate.ACTION_TYPES.includes(id), `gate missing ${id}`);
    assert.ok(new RegExp(`${id}:\\s*'${id}'`).test(map), `server.js map missing ${id}`);
  }
});

test('disposition candidate now points at a real template', () => {
  const r = assessDisposition({ assetTag: 'A1', warrantyStatus: 'OUT_OF_WARRANTY', condition: 'NON_FUNCTIONAL' });
  assert.strictEqual(r.suggestedTemplate, 'DISPOSITION_RECOMMENDATION');
  assert.ok(registry.listTemplates().some(t => t.id === r.suggestedTemplate));
});

assert.rejects(async () => {
  const a = gate.generateAction({ actionType: 'DISPOSITION_COMPLETION', payload: {}, technician: { id: 't' }, sourceIncident: 'INC0012345', asset: 'A1' });
  return gate.executeAction(a, async () => ({}));
}).then(
  () => console.log('PASS a disposition action cannot execute before preview + confirm'),
  e => { console.error('FAIL a disposition action cannot execute before preview + confirm'); throw e; }
);

console.log('\nL1 disposition template tests complete.');
