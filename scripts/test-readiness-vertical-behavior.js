const assert = require('assert');
const { assessProfessionalReadiness } = require('../server/readiness/professional-readiness-model');
let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('  PASS ' + name); };
const ev = (type, score) => ({ type, score, weight: 1, recordedAt: '2026-10-04T00:00:00.000Z', meta: { source: 'test' } });

['mlo_safe_quiz', 'sap_exam', 'm365_exam', 'aplus_exam'].forEach(function (t) {
  const r = assessProfessionalReadiness([ev(t, 82)]);
  ok(t + ' is accepted and assesses technical', () => {
    assert.ok(!r.ignored.unmapped.includes(t), t + ' still listed as unmapped');
    assert.strictEqual(r.dimensions.technical.status, 'assessed');
    assert.strictEqual(r.dimensions.technical.evidenceCount, 1);
    assert.ok(Number.isFinite(r.dimensions.technical.score));
  });
});

ok('an unknown type is still ignored, so the maps do not accept everything', () => {
  const r = assessProfessionalReadiness([ev('zzz_not_a_type', 82)]);
  assert.ok(r.ignored.unmapped.includes('zzz_not_a_type'));
  assert.notStrictEqual(r.dimensions.technical.status, 'assessed');
});

ok('exam-only evidence covers 1 of 5 dimensions, not a full profile', () => {
  const r = assessProfessionalReadiness([ev('sap_exam', 90), ev('aplus_exam', 70)]);
  assert.strictEqual(r.overall.assessedDimensions.length, 1);
  assert.strictEqual(r.overall.coverage, 0.2);
  assert.strictEqual(r.dimensions.technical.evidenceCount, 2);
});

const sample = assessProfessionalReadiness([ev('sap_exam', 82)]);
console.log('  sample technical: ' + JSON.stringify({ score: sample.dimensions.technical.score, confidence: sample.dimensions.technical.confidence, quality: sample.dimensions.technical.evidenceQuality }));
console.log('  sample overall:   ' + JSON.stringify({ score: sample.overall.score, coverage: sample.overall.coverage, confidence: sample.overall.confidence }));
console.log(n + ' passed, 0 failed');
