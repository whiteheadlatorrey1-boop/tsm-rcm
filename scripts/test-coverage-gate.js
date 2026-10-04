const assert = require('assert');
const model = require('../server/readiness/professional-readiness-model');
const registry = require('../server/candidate-registry-service');
require('../server/staffing-engine-service');
let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('  PASS ' + name); };
const ev = (type, score) => ({ type, score, weight: 1, recordedAt: '2026-10-04T00:00:00.000Z', meta: {} });

ok('registry exports a read-only events getter', () => assert.strictEqual(typeof registry.listTrainingEvents, 'function'));
ok('quiz-only evidence covers 1 dimension (blocked at a requirement of 2)', () => {
  assert.strictEqual(model.assessProfessionalReadiness([ev('sap_exam', 90), ev('aplus_exam', 90)]).overall.assessedDimensions.length, 1);
});
ok('exam plus a practice event covers 3 dimensions (allowed)', () => {
  const r = model.assessProfessionalReadiness([ev('sap_exam', 85), ev('mock_shift', 80)]);
  assert.deepStrictEqual(r.overall.assessedDimensions.slice().sort(), ['professional', 'reliability', 'technical']);
});
console.log(n + ' passed, 0 failed');
