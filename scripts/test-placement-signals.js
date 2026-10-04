const assert = require('assert');
const S = require('../html/js/career/tsm-placement-signals');
let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('  PASS ' + name); };
const rec = (p, stage, at, emp) => ({ placementEvidenceId: 'pev_' + p + stage, stream: 'placement_outcome', stage, occurredAt: at, candidateId: 'cand_secret', placementId: p, jobOrderId: 'job1', employerId: emp || 'emp1' });

const recs = [
  rec('p1', 'placed', '2026-10-04T12:00:00Z'),
  rec('p1', 'submitted', '2026-10-04T00:00:00Z'),
  rec('p1', 'interviewing', '2026-10-04T06:00:00Z'),
  rec('p2', 'submitted', '2026-10-04T00:00:00Z'),
  rec('p2', 'declined', '2026-10-05T00:00:00Z'),
  rec('p3', 'submitted', '2026-10-04T00:00:00Z'),
  rec('p1', 'placed', '2026-10-04T12:00:00Z'),
  { stream: 'training', stage: 'quiz' },
  rec('p4', 'offered', 'not-a-date')
];
const out = S.buildPlacementSignals(recs);
const sg = out.signals;

ok('orders by time and computes hours', () => {
  const p1 = sg.placements.find(p => p.placementId === 'p1');
  assert.deepStrictEqual(p1.stagesReached, ['submitted', 'interviewing', 'placed']);
  assert.strictEqual(p1.hoursToPlace, 12);
  assert.strictEqual(p1.transitions[0].hours, 6);
});
ok('terminal outcomes and open', () => {
  const t = id => sg.placements.find(p => p.placementId === id).terminal;
  assert.strictEqual(t('p1'), 'placed'); assert.strictEqual(t('p2'), 'declined'); assert.strictEqual(t('p3'), 'open');
});
ok('stage reach and employer counts', () => {
  assert.strictEqual(sg.stageReach.submitted, 3);
  assert.strictEqual(sg.employers[0].placements, 3);
  assert.strictEqual(sg.employers[0].medianHoursToPlace, 12);
});
ok('rejects bad, duplicate and foreign records', () => {
  const reasons = out.rejected.map(r => r.reason).sort();
  assert.deepStrictEqual(reasons, ['duplicate-entry', 'not-placement-evidence', 'timestamp-invalid']);
});
ok('no candidateId anywhere in output', () => {
  assert.ok(!JSON.stringify(sg).includes('cand_secret'));
});
ok('empty and non-array input are safe', () => {
  assert.strictEqual(S.buildPlacementSignals(null).signals.placementCount, 0);
});
ok('output is frozen', () => { assert.ok(Object.isFrozen(sg)); });
console.log(n + ' passed, 0 failed');
