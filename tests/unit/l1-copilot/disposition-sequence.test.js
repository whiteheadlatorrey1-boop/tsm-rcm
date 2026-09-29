'use strict';

const assert = require('assert');
const seq = require('../../../server/l1-copilot/disposition-sequence');
const { renderTemplate } = require('../../../server/l1-copilot/template-registry');

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); } catch (e) { console.error(`FAIL ${name}`); throw e; }
}

const common = { INCIDENT_NUMBER: 'INC0012345', ASSET_TAG: 'A1', TECHNICIAN: 't1' };
const ctx = {
  DISPOSITION_RECOMMENDATION: { WARRANTY_STATUS: 'OUT_OF_WARRANTY', CONDITION: 'NON_FUNCTIONAL', RECOMMENDATION_REASONS: 'r' },
  DISPOSITION_APPROVAL: { APPROVER: 'J', APPROVAL_REFERENCE: 'R1' },
  DISPOSITION_SANITIZATION: { SANITIZATION_METHOD: 'Purge', SANITIZATION_VERIFIED_BY: 't2' },
  DISPOSITION_COMPLETION: { DISPOSITION_METHOD: 'Recycler', DISPOSITION_REFERENCE: 'C1' }
};
// Same shape the execute route writes.
const note = (stage, over = {}) =>
  `[ASSET LIFECYCLE \u2014 ${stage}]\n${renderTemplate(stage, { ...common, ...ctx[stage], ...over }).body}`;

test('stage order is recommendation -> approval -> sanitization -> completion', () => {
  assert.deepStrictEqual(seq.requiredPriorStages('DISPOSITION_RECOMMENDATION'), []);
  assert.deepStrictEqual(seq.requiredPriorStages('DISPOSITION_COMPLETION'), seq.STAGE_ORDER.slice(0, 3));
  assert.deepStrictEqual(seq.requiredPriorStages('RETURN_TO_INVENTORY'), []);
});

test('recorded stages are parsed from real rendered notes for the right asset only', () => {
  const text = [note('DISPOSITION_RECOMMENDATION'), note('DISPOSITION_APPROVAL', { ASSET_TAG: 'OTHER-ASSET' })].join('\n\n');
  const a1 = seq.recordedStages('a1', text);
  assert.ok(a1.has('DISPOSITION_RECOMMENDATION'));
  assert.ok(!a1.has('DISPOSITION_APPROVAL'), 'approval for a different asset must not count');
});

test('completion is blocked until approval and sanitization exist', () => {
  const t1 = note('DISPOSITION_RECOMMENDATION');
  let r = seq.checkPrerequisites('DISPOSITION_COMPLETION', 'A1', t1);
  assert.strictEqual(r.allowed, false);
  assert.deepStrictEqual(r.missing, ['DISPOSITION_APPROVAL', 'DISPOSITION_SANITIZATION']);
  const t2 = [t1, note('DISPOSITION_APPROVAL'), note('DISPOSITION_SANITIZATION')].join('\n');
  assert.strictEqual(seq.checkPrerequisites('DISPOSITION_COMPLETION', 'A1', t2).allowed, true);
});

test('sanitization cannot skip approval', () => {
  const t = note('DISPOSITION_RECOMMENDATION');
  assert.deepStrictEqual(seq.checkPrerequisites('DISPOSITION_SANITIZATION', 'A1', t).missing, ['DISPOSITION_APPROVAL']);
});

test('fail-closed: empty / non-string notes prove nothing', () => {
  for (const bad of ['', null, undefined, 42]) {
    assert.strictEqual(seq.checkPrerequisites('DISPOSITION_APPROVAL', 'A1', bad).allowed, false);
  }
  assert.strictEqual(seq.checkPrerequisites('DISPOSITION_APPROVAL', '', note('DISPOSITION_RECOMMENDATION')).allowed, false);
});

test('a stage name typed by a user inside free text on another asset does not spoof a stage', () => {
  const spoof = note('DISPOSITION_RECOMMENDATION', { TECHNICIAN_NOTES: 'Asset Tag: A1' , ASSET_TAG: 'B2' });
  assert.ok(!seq.recordedStages('A1', spoof).has('DISPOSITION_RECOMMENDATION'));
});

test('derived closure evidence only reflects recorded stages', () => {
  const t = [note('DISPOSITION_RECOMMENDATION'), note('DISPOSITION_APPROVAL')].join('\n');
  assert.deepStrictEqual(seq.deriveDispositionEvidence('A1', t),
    { approvalObtained: true, sanitizationVerified: false, dispositionCompleted: false });
  assert.deepStrictEqual(seq.deriveDispositionEvidence('A1', ''),
    { approvalObtained: false, sanitizationVerified: false, dispositionCompleted: false });
});

test('extractNotesText handles string, display_value/value objects, and missing', () => {
  assert.strictEqual(seq.extractNotesText({ raw: { work_notes: 'x' } }), 'x');
  assert.strictEqual(seq.extractNotesText({ raw: { work_notes: { display_value: 'd', value: 'v' } } }), 'd');
  assert.strictEqual(seq.extractNotesText({ raw: { work_notes: { value: 'v' } } }), 'v');
  assert.strictEqual(seq.extractNotesText(null), '');
});

console.log('\nL1 disposition sequence tests complete.');
