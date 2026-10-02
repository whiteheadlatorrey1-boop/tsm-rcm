'use strict';

const assert = require('assert');
const {
  ASSET_STATES, TRANSITIONS, isValidTransition, assessDisposition, evaluateDispositionReadiness
} = require('../../../server/l1-copilot/asset-lifecycle');
const { listTemplates } = require('../../../server/l1-copilot/template-registry');
const { getRequiredEvidence } = require('../../../server/l1-copilot/workflow-contract');

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); } catch (e) { console.error(`FAIL ${name}`); throw e; }
}
const base = { assetTag: 'A1' };

test('missing facts -> INSUFFICIENT_DATA, never a guess', () => {
  const r = assessDisposition({});
  assert.strictEqual(r.recommendation, 'INSUFFICIENT_DATA');
  assert.deepStrictEqual(r.missingInputs, ['assetTag', 'warrantyStatus', 'condition']);
  const r2 = assessDisposition({ ...base, warrantyStatus: 'maybe', condition: 'GOOD' });
  assert.strictEqual(r2.recommendation, 'INSUFFICIENT_DATA');
});

test('in warranty + impaired -> WARRANTY_RETURN', () => {
  const r = assessDisposition({ ...base, warrantyStatus: 'IN_WARRANTY', condition: 'NON_FUNCTIONAL' });
  assert.strictEqual(r.recommendation, 'WARRANTY_RETURN');
  assert.strictEqual(r.suggestedTemplate, 'WARRANTY_DEPOT_RETURN');
});

test('out of warranty + non-functional -> DISPOSITION_CANDIDATE with gates', () => {
  const r = assessDisposition({ ...base, warrantyStatus: 'OUT_OF_WARRANTY', condition: 'NON_FUNCTIONAL' });
  assert.strictEqual(r.recommendation, 'DISPOSITION_CANDIDATE');
  assert.ok(r.requiredGates.includes('APPROVAL') && r.requiredGates.includes('SECURITY'));
});

test('unknown data-bearing status is treated as data-bearing (fail-safe)', () => {
  const r = assessDisposition({ ...base, warrantyStatus: 'OUT_OF_WARRANTY', condition: 'NON_FUNCTIONAL' });
  assert.strictEqual(r.requiresSecurityGate, true);
  const safe = assessDisposition({ ...base, warrantyStatus: 'OUT_OF_WARRANTY', condition: 'NON_FUNCTIONAL', dataBearing: false });
  assert.strictEqual(safe.requiresSecurityGate, false);
  assert.strictEqual(safe.humanApprovalRequired, true);
});

test('out of warranty + poor: repair vs disposition by repair threshold', () => {
  const poor = { ...base, warrantyStatus: 'OUT_OF_WARRANTY', condition: 'POOR' };
  assert.strictEqual(assessDisposition({ ...poor, repairCount: 1 }).recommendation, 'REPAIR');
  assert.strictEqual(assessDisposition({ ...poor, repairCount: 2 }).recommendation, 'DISPOSITION_CANDIDATE');
  assert.strictEqual(assessDisposition({ ...poor, repairCount: 1 }, { dispositionRepairThreshold: 1 }).recommendation, 'DISPOSITION_CANDIDATE');
});

test('usable device -> return to pool via existing templates', () => {
  const loaner = assessDisposition({ ...base, warrantyStatus: 'OUT_OF_WARRANTY', condition: 'GOOD', isLoaner: true });
  assert.strictEqual(loaner.suggestedTemplate, 'LOANER_RETURN');
  const inv = assessDisposition({ ...base, warrantyStatus: 'IN_WARRANTY', condition: 'FAIR' });
  assert.strictEqual(inv.suggestedTemplate, 'RETURN_TO_INVENTORY');
  const re = assessDisposition({ ...base, warrantyStatus: 'IN_WARRANTY', condition: 'GOOD', reassignmentRequested: true });
  assert.strictEqual(re.recommendation, 'REASSIGN');
});

test('suggested templates exist in the real template registry', () => {
  const ids = new Set(listTemplates().map(t => t.id));
  const combos = [
    ['IN_WARRANTY', 'POOR'], ['IN_WARRANTY', 'GOOD'], ['OUT_OF_WARRANTY', 'GOOD']
  ];
  for (const [w, c] of combos) {
    for (const extra of [{}, { isLoaner: true }, { reassignmentRequested: true }]) {
      const r = assessDisposition({ ...base, warrantyStatus: w, condition: c, ...extra });
      if (r.suggestedTemplate) assert.ok(ids.has(r.suggestedTemplate), r.suggestedTemplate);
    }
  }
});

test('every result forbids autonomous action', () => {
  for (const w of ['IN_WARRANTY', 'OUT_OF_WARRANTY']) for (const c of ['GOOD', 'FAIR', 'POOR', 'NON_FUNCTIONAL']) {
    const r = assessDisposition({ ...base, warrantyStatus: w, condition: c });
    assert.strictEqual(r.autonomousActionAllowed, false);
    assert.strictEqual(r.humanApprovalRequired, true);
  }
});

test('disposition readiness: complete evidence -> READY', () => {
  const ev = Object.fromEntries(getRequiredEvidence('DISPOSITION').map(k => [k, true]));
  const r = evaluateDispositionReadiness(ev);
  assert.strictEqual(r.status, 'READY');
  assert.strictEqual(r.autonomousCloseAllowed, false);
});

test('disposition readiness: missing evidence -> BLOCKED', () => {
  const ev = Object.fromEntries(getRequiredEvidence('DISPOSITION').map(k => [k, true]));
  ev.sanitizationVerified = false;
  const r = evaluateDispositionReadiness(ev);
  assert.strictEqual(r.status, 'BLOCKED');
  assert.deepStrictEqual(r.missing, ['sanitizationVerified']);
});

test('disposition readiness: sanitization or disposition before approval is blocked', () => {
  const ev = Object.fromEntries(getRequiredEvidence('DISPOSITION').map(k => [k, true]));
  ev.approvalObtained = false;
  const r = evaluateDispositionReadiness(ev);
  assert.strictEqual(r.ready, false);
  assert.ok(r.orderViolations.length >= 1);
});

test('lifecycle transitions: disposal only via recovery/repair, RETIRED is terminal', () => {
  assert.ok(isValidTransition('RECOVERY', 'DISPOSITION_PENDING'));
  assert.ok(isValidTransition('DISPOSITION_PENDING', 'RETIRED'));
  assert.ok(!isValidTransition('ASSIGNED', 'RETIRED'));
  assert.ok(!isValidTransition('INVENTORY', 'RETIRED'));
  assert.deepStrictEqual(TRANSITIONS.RETIRED, []);
  for (const [from, tos] of Object.entries(TRANSITIONS)) {
    assert.ok(ASSET_STATES.includes(from));
    tos.forEach(t => assert.ok(ASSET_STATES.includes(t)));
  }
});

console.log('\nL1 asset lifecycle tests complete.');
