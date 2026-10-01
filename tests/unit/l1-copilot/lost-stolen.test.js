'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const registry = require('../../../server/l1-copilot/template-registry');
const gate = require('../../../server/l1-copilot/action-gate');
const metrics = require('../../../server/l1-copilot/metrics-store');
const seq = require('../../../server/l1-copilot/lost-stolen-sequence');
const engine = require('../../../server/l1-copilot/workflow-engine');
const { evaluateClosure } = require('../../../server/l1-copilot/closure-gate');

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('PASS ' + name); }
  catch (e) { fail++; console.log('FAIL ' + name + ' - ' + e.message); }
}

const STAGES = ['LOST_STOLEN_REPORT', 'LOST_STOLEN_ESCALATION', 'LOST_STOLEN_SECURITY_ACTION', 'LOST_STOLEN_RECONCILED'];
const common = { INCIDENT_NUMBER: 'INC0012345', ASSET_TAG: 'A1', TECHNICIAN: 'tech1' };
const stageCtx = {
  LOST_STOLEN_REPORT: { ASSIGNED_USER: 'jdoe', LOSS_CLASSIFICATION: 'LOST', LOSS_DATE: '2026-09-27', LAST_KNOWN_LOCATION: 'Airport' },
  LOST_STOLEN_ESCALATION: { ESCALATED_TO: 'SecOps', SECURITY_REFERENCE: 'SEC-1' },
  LOST_STOLEN_SECURITY_ACTION: { SECURITY_ACTION: 'Remote wipe', SECURITY_ACTOR: 'SecOps', SECURITY_VERIFIED_BY: 'tech2' },
  LOST_STOLEN_RECONCILED: { RECONCILED_STATUS: 'Lost/Stolen', RECONCILIATION_REFERENCE: 'CMDB-1' }
};
const NOW = new Date('2026-09-29T12:00:00Z');
const render = (id, extra) => registry.renderTemplate(id, { ...common, ...stageCtx[id], ...(extra || {}) }, { now: NOW });

// ---- templates -------------------------------------------------------
test('all four stages register and render with their heading', () => {
  for (const id of STAGES) assert.ok(render(id).body.startsWith('[LOST/STOLEN'), id);
});

test('each stage refuses to render without any of its human-supplied fields', () => {
  for (const id of STAGES) {
    const tpl = registry.listTemplates().find(t => t.id === id);
    for (const name of tpl.required) {
      const ctx = { ...common, ...stageCtx[id] }; delete ctx[name];
      assert.throws(() => registry.renderTemplate(id, ctx, { now: NOW }),
        e => e.code === 'MISSING_REQUIRED_FIELDS' && e.missing.includes(name), id + ':' + name);
    }
  }
});

test('security action record cannot be rendered without who performed AND who verified it', () => {
  for (const name of ['SECURITY_ACTOR', 'SECURITY_VERIFIED_BY']) {
    assert.throws(() => render('LOST_STOLEN_SECURITY_ACTION', { [name]: '   ' }), e => e.code === 'MISSING_REQUIRED_FIELDS');
  }
});

for (const bad of ['MISPLACED', 'found', '', 'lost or stolen']) {
  test(`report: LOSS_CLASSIFICATION "${bad}" is refused`, () => {
    assert.throws(() => render('LOST_STOLEN_REPORT', { LOSS_CLASSIFICATION: bad }),
      e => ['GATE_NOT_SATISFIED', 'MISSING_REQUIRED_FIELDS'].includes(e.code));
  });
}
test('report: classification is case-insensitive', () => {
  assert.ok(render('LOST_STOLEN_REPORT', { LOSS_CLASSIFICATION: ' stolen ' }).body.includes('Loss Classification: stolen'));
});
for (const [label, val] of [['future', '2026-10-01'], ['not a date', 'yesterday'], ['bad format', '09/27/2026'], ['impossible', '2026-02-30']]) {
  test(`report: LOSS_DATE ${label} (${val}) is refused`, () => {
    assert.throws(() => render('LOST_STOLEN_REPORT', { LOSS_DATE: val }),
      e => e.code === 'GATE_NOT_SATISFIED' && e.failedGates.includes('LOSS_DATE'));
  });
}
test('report: loss date of today is accepted', () => {
  assert.ok(render('LOST_STOLEN_REPORT', { LOSS_DATE: '2026-09-29' }).body.includes('2026-09-29'));
});

test('every stage has an action type in the gate, metrics store and server route map', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../../server.js'), 'utf8');
  const start = src.indexOf('const TEMPLATE_TO_ACTION_TYPE');
  const map = src.slice(start, src.indexOf('};', start));
  for (const id of STAGES) {
    assert.ok(gate.ACTION_TYPES.includes(id), 'gate missing ' + id);
    assert.ok(metrics.ACTION_TYPES.includes(id), 'metrics missing ' + id);
    assert.ok(new RegExp(`${id}:\\s*'${id}'`).test(map), 'server.js map missing ' + id);
  }
});

test('disposition stages are also known to the metrics store (previously rejected)', () => {
  for (const id of ['DISPOSITION_RECOMMENDATION', 'DISPOSITION_APPROVAL', 'DISPOSITION_SANITIZATION', 'DISPOSITION_COMPLETION'])
    assert.ok(metrics.ACTION_TYPES.includes(id), id);
});

// ---- sequence --------------------------------------------------------
const note = (stage, tag) => `[ASSET LIFECYCLE \u2014 ${stage}]\n[X]\nIncident: INC1\nAsset Tag: ${tag}\n`;

test('stage order is report -> escalation -> security action -> reconciled', () => {
  assert.deepStrictEqual(seq.STAGE_ORDER, STAGES);
  assert.deepStrictEqual(seq.requiredPriorStages('LOST_STOLEN_REPORT'), []);
  assert.deepStrictEqual(seq.requiredPriorStages('LOST_STOLEN_RECONCILED'), STAGES.slice(0, 3));
});

test('checkPrerequisites blocks a later stage and names what is missing', () => {
  const r = seq.checkPrerequisites('LOST_STOLEN_SECURITY_ACTION', 'A1', note('LOST_STOLEN_REPORT', 'A1'));
  assert.strictEqual(r.allowed, false);
  assert.deepStrictEqual(r.missing, ['LOST_STOLEN_ESCALATION']);
});

test('checkPrerequisites allows a stage once all earlier ones are recorded', () => {
  const text = STAGES.slice(0, 2).map(s => note(s, 'A1')).join('\n');
  assert.strictEqual(seq.checkPrerequisites('LOST_STOLEN_SECURITY_ACTION', 'A1', text).allowed, true);
});

test('stages are scoped to the asset tag (case-insensitive) and do not carry over', () => {
  const text = note('LOST_STOLEN_REPORT', 'a1');
  assert.ok(seq.recordedStages('A1', text).has('LOST_STOLEN_REPORT'));
  assert.strictEqual(seq.recordedStages('B2', text).size, 0);
});

test('fail-closed: empty/missing/non-string notes record nothing', () => {
  for (const n of ['', null, undefined, 42]) assert.strictEqual(seq.recordedStages('A1', n).size, 0);
  assert.strictEqual(seq.checkPrerequisites('LOST_STOLEN_ESCALATION', 'A1', '').allowed, false);
  assert.strictEqual(seq.checkPrerequisites('LOST_STOLEN_ESCALATION', '', note('LOST_STOLEN_REPORT', 'A1')).allowed, false);
});

test('non lost/stolen actions are never blocked by this module', () => {
  assert.deepStrictEqual(seq.checkPrerequisites('RETURN_TO_INVENTORY', 'A1', ''), { allowed: true, missing: [] });
});

test('deriveLostStolenEvidence maps stages to contract evidence keys', () => {
  const text = STAGES.slice(0, 3).map(s => note(s, 'A1')).join('\n');
  assert.deepStrictEqual(seq.deriveLostStolenEvidence('A1', text),
    { securityEscalation: true, securityActionVerified: true, assetReconciled: false });
});

test('extractNotesText handles string, display_value, value and absent shapes', () => {
  assert.strictEqual(seq.extractNotesText({ raw: { work_notes: 'a' } }), 'a');
  assert.strictEqual(seq.extractNotesText({ raw: { work_notes: { display_value: 'b' } } }), 'b');
  assert.strictEqual(seq.extractNotesText({ raw: { work_notes: { value: 'c' } } }), 'c');
  assert.strictEqual(seq.extractNotesText(null), '');
});

// ---- engine / closure ------------------------------------------------
test('engine classifies stolen/lost hardware as LOST STOLEN', () => {
  for (const t of ['Laptop was stolen from car', 'user reports lost laptop', 'Missing phone', 'theft at the airport'])
    assert.strictEqual(engine.classifyTask({ shortDescription: t }).taskType, 'LOST STOLEN', t);
});

test('engine does NOT misclassify ordinary "lost" tickets as security incidents', () => {
  for (const t of ['lost password reset', 'lost connection to VPN', 'user lost access to shared drive'])
    assert.notStrictEqual(engine.classifyTask({ shortDescription: t }).taskType, 'LOST STOLEN', t);
});

test('explicit task type aliases normalise to LOST STOLEN', () => {
  for (const a of ['LOST_STOLEN', 'lost/stolen', 'Lost Stolen', 'LOSTSTOLEN']) assert.strictEqual(engine.normalizeTaskType(a), 'LOST STOLEN', a);
});

test('LOST STOLEN evidence comes from the workflow contract', () => {
  const keys = engine.getRequiredEvidence('LOST STOLEN').map(e => e.key);
  assert.deepStrictEqual(keys, ['userVerified', 'assetVerified', 'securityEscalation', 'securityActionVerified', 'assetReconciled', 'finalWorkNoteConfirmed']);
});

test('closure is blocked until every security evidence item is confirmed', () => {
  const ev = { userVerified: true, assetVerified: true, securityEscalation: true, securityActionVerified: false, assetReconciled: true, finalWorkNoteConfirmed: true };
  const r = evaluateClosure({ state: 'IN PROGRESS', taskType: 'LOST STOLEN', evidence: ev });
  assert.strictEqual(r.readyForClosure, false);
  assert.deepStrictEqual(r.missingEvidence.map(m => m.key), ['securityActionVerified']);
  assert.strictEqual(evaluateClosure({ state: 'IN PROGRESS', taskType: 'LOST STOLEN', evidence: { ...ev, securityActionVerified: true } }).readyForClosure, true);
});

test('template assistant suggests the report stage for stolen-device text', () => {
  const a = require('../../../server/l1-copilot/template-assistant');
  const s = a.suggestTemplate({ shortDescription: 'Employee laptop stolen, theft reported' });
  assert.strictEqual(s.templateId, 'LOST_STOLEN_REPORT');
  assert.strictEqual(s.executable, false);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
