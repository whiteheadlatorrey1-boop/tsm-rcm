'use strict';
const assert = require('assert');
const { buildWorkNoteAuditEvent } = require('../server/l1-copilot/work-note-audit');
const { buildWorkNoteEvidence, buildWorkNoteEvidenceFromStore } = require('../server/certification/work-note-evidence');

let passed = 0, failed = 0;
function t(name, fn) { try { fn(); passed++; console.log('ok   ' + name); } catch (e) { failed++; console.log('FAIL ' + name + ': ' + e.message); } }

// Mimics recordL1AuditEvent() in server.js: flattens the builder output.
function stored(inc, session, success = true) {
  const e = buildWorkNoteAuditEvent({ incidentId: inc, noteLength: 40, session, user: {}, result: { success } });
  return {
    id: 'rec-' + inc, eventType: e.eventType, actionType: e.action.actionType, sourceIncident: e.action.sourceIncident,
    technician: e.action.technician, state: e.action.state, confirmed: true, executed: false, references: null,
    executionResult: e.executionResult, governed: { autonomousExecutionAllowed: false }, metadata: e.metadata,
  };
}
const rev = (inc, tech, score, reviewerId = 'boss') => ({ incidentId: inc, technicianId: tech, score, reviewerId });

t('stored shape counts as a worker write', () => assert.strictEqual(buildWorkNoteEvidence([stored('I1', { staffId: 's1' })], []).workers.s1.totalWrites, 1));
t('stored shape matches a review', () => assert.strictEqual(buildWorkNoteEvidence([stored('I1', { staffId: 's1' })], [rev('I1', 's1', 80)]).workers.s1.evidence.length, 1));
t('stored role identity is unattributed', () => assert.strictEqual(buildWorkNoteEvidence([stored('I1', { role: 'technician' })], []).unattributed, 1));
t('stored failed write ignored', () => assert.strictEqual(buildWorkNoteEvidence([stored('I1', { staffId: 's1' }, false)], []).ignored, 1));
t('stored missing incident ignored', () => { const r = stored('I1', { staffId: 's1' }); delete r.sourceIncident; assert.strictEqual(buildWorkNoteEvidence([r], [rev('undefined', 's1', 90)]).ignored, 1); });
t('stored missing technician ignored safely', () => { const r = stored('I1', { staffId: 's1' }); delete r.technician; assert.strictEqual(buildWorkNoteEvidence([r], []).unattributed, 1); });
t('mixed shapes both count', () => {
  const b = buildWorkNoteAuditEvent({ incidentId: 'I2', noteLength: 5, session: { staffId: 's1' }, result: { success: true } });
  assert.strictEqual(buildWorkNoteEvidence([stored('I1', { staffId: 's1' }), b], []).workers.s1.totalWrites, 2);
});
t('store reader asks for work-note events only', () => {
  let asked = null;
  const fake = { listAudit(f) { asked = f; return [stored('I1', { staffId: 's1' })]; } };
  const r = buildWorkNoteEvidenceFromStore(fake, [rev('I1', 's1', 70)]);
  assert.deepStrictEqual(asked, { eventType: 'WORK_NOTE_WRITTEN' });
  assert.strictEqual(r.workers.s1.evidence[0].score, 70);
});
t('empty store gives no workers', () => assert.deepStrictEqual(buildWorkNoteEvidenceFromStore({ listAudit: () => [] }, []), { workers: {}, unattributed: 0, ignored: 0 }));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
