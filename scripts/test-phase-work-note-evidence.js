'use strict';
const assert = require('assert');
const { buildWorkNoteAuditEvent } = require('../server/l1-copilot/work-note-audit');
const { buildWorkNoteEvidence } = require('../server/certification/work-note-evidence');
const { evaluateReadiness } = require('../server/certification/readiness-gate');

let passed = 0, failed = 0;
function t(name, fn) { try { fn(); passed++; console.log('ok   ' + name); } catch (e) { failed++; console.log('FAIL ' + name + ': ' + e.message); } }
const ev = (inc, session, success = true) => buildWorkNoteAuditEvent({ incidentId: inc, noteLength: 40, session, user: {}, result: { success } });
const staff = (id) => ({ staffId: id });
const rev = (inc, tech, score, reviewerId = 'boss') => ({ incidentId: inc, technicianId: tech, score, reviewerId });

t('staffId event becomes a worker write', () => {
  const r = buildWorkNoteEvidence([ev('INC1', staff('s1'))], []);
  assert.strictEqual(r.workers.s1.totalWrites, 1);
  assert.strictEqual(r.workers.s1.pendingReview, 1);
  assert.strictEqual(r.workers.s1.evidence.length, 0);
});
t('matching review makes scored, reviewed evidence', () => {
  const r = buildWorkNoteEvidence([ev('INC1', staff('s1'))], [rev('INC1', 's1', 85)]);
  assert.deepStrictEqual(r.workers.s1.evidence, [{ skillId: 'work-notes', score: 85, reviewed: true }]);
  assert.strictEqual(r.workers.s1.pendingReview, 0);
});
t('role identity is unattributed', () => { const r = buildWorkNoteEvidence([ev('INC1', { role: 'technician' })], []); assert.strictEqual(r.unattributed, 1); assert.deepStrictEqual(r.workers, {}); });
t('clientId identity is unattributed', () => assert.strictEqual(buildWorkNoteEvidence([ev('INC1', { clientId: 'c1' })], []).unattributed, 1));
t('no identity is unattributed', () => assert.strictEqual(buildWorkNoteEvidence([ev('INC1', null)], []).unattributed, 1));
t('failed write is ignored', () => { const r = buildWorkNoteEvidence([ev('INC1', staff('s1'), false)], []); assert.strictEqual(r.ignored, 1); assert.deepStrictEqual(r.workers, {}); });
t('other event types ignored', () => assert.strictEqual(buildWorkNoteEvidence([{ eventType: 'SOMETHING_ELSE' }], []).ignored, 1));
t('self-review rejected', () => assert.strictEqual(buildWorkNoteEvidence([ev('INC1', staff('s1'))], [rev('INC1', 's1', 90, 's1')]).workers.s1.evidence.length, 0));
t('review without reviewerId rejected', () => assert.strictEqual(buildWorkNoteEvidence([ev('INC1', staff('s1'))], [{ incidentId: 'INC1', technicianId: 's1', score: 90 }]).workers.s1.evidence.length, 0));
t('out-of-range score rejected', () => assert.strictEqual(buildWorkNoteEvidence([ev('INC1', staff('s1'))], [rev('INC1', 's1', 150)]).workers.s1.evidence.length, 0));
t('NaN score rejected', () => assert.strictEqual(buildWorkNoteEvidence([ev('INC1', staff('s1'))], [rev('INC1', 's1', NaN)]).workers.s1.evidence.length, 0));
t('review for another technician not matched', () => assert.strictEqual(buildWorkNoteEvidence([ev('INC1', staff('s1'))], [rev('INC1', 's2', 90)]).workers.s1.evidence.length, 0));
t('review for another incident not matched', () => assert.strictEqual(buildWorkNoteEvidence([ev('INC1', staff('s1'))], [rev('INC2', 's1', 90)]).workers.s1.evidence.length, 0));
t('numeric and string incident ids match', () => assert.strictEqual(buildWorkNoteEvidence([ev(7, staff('s1'))], [rev('7', 's1', 80)]).workers.s1.evidence.length, 1));
t('workers are kept separate', () => { const r = buildWorkNoteEvidence([ev('A', staff('s1')), ev('B', staff('s2'))], [rev('A', 's1', 70)]); assert.strictEqual(r.workers.s1.evidence.length, 1); assert.strictEqual(r.workers.s2.evidence.length, 0); });
t('null inputs are safe', () => { const r = buildWorkNoteEvidence(null, null); assert.deepStrictEqual(r, { workers: {}, unattributed: 0, ignored: 0 }); });
t('note length does not change score', () => {
  const a = buildWorkNoteAuditEvent({ incidentId: 'X', noteLength: 1, session: staff('s1'), result: { success: true } });
  const b = buildWorkNoteAuditEvent({ incidentId: 'X', noteLength: 9999, session: staff('s1'), result: { success: true } });
  const r1 = buildWorkNoteEvidence([a], [rev('X', 's1', 60)]); const r2 = buildWorkNoteEvidence([b], [rev('X', 's1', 60)]);
  assert.deepStrictEqual(r1.workers.s1.evidence, r2.workers.s1.evidence);
});
t('feeds the gate with sample size', () => {
  const events = Array.from({ length: 5 }, (_, i) => ev('I' + i, staff('s1')));
  const reviews = Array.from({ length: 5 }, (_, i) => rev('I' + i, 's1', 80));
  const w = buildWorkNoteEvidence(events, reviews).workers.s1;
  const g = evaluateReadiness('servicenow-csa', w.evidence);
  const wn = g.skills.find((s) => s.skillId === 'work-notes');
  assert.strictEqual(wn.sampleSize, 5);
  assert.strictEqual(wn.status, 'ok');
});
t('work-notes alone does not make a worker CSA-ready', () => {
  const events = Array.from({ length: 5 }, (_, i) => ev('I' + i, staff('s1')));
  const reviews = Array.from({ length: 5 }, (_, i) => rev('I' + i, 's1', 95));
  assert.strictEqual(evaluateReadiness('servicenow-csa', buildWorkNoteEvidence(events, reviews).workers.s1.evidence).ready, false);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
