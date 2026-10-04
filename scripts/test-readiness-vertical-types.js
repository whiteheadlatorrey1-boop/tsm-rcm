const assert = require('assert');
const model = require('../server/readiness/professional-readiness-model');
const layer = require('../server/readiness/evidence-layer');
let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('  PASS ' + name); };
const TYPES = ['mlo_safe_quiz', 'sap_exam', 'm365_exam', 'aplus_exam'];

console.log('model exports: ' + Object.keys(model).join(', '));

ok('all vertical exam types are in EVENT_MAP', () => {
  TYPES.forEach(t => assert.ok(model.EVENT_MAP[t], t + ' missing from EVENT_MAP'));
});
ok('new types match the MLO shape (knowledge, technical)', () => {
  const ref = JSON.stringify(model.EVENT_MAP.mlo_safe_quiz);
  ['sap_exam', 'm365_exam', 'aplus_exam'].forEach(t => assert.strictEqual(JSON.stringify(model.EVENT_MAP[t]), ref));
});
ok('all vertical exam types are in TYPE_CATEGORY as training', () => {
  TYPES.forEach(t => assert.strictEqual(layer.TYPE_CATEGORY[t], 'training'));
});
ok('EVENT_MAP and TYPE_CATEGORY cover the same types', () => {
  const a = Object.keys(model.EVENT_MAP).filter(t => t !== 'readiness_assessment').sort();
  const b = Object.keys(layer.TYPE_CATEGORY).filter(t => t !== 'readiness_assessment').sort();
  assert.deepStrictEqual(a, b);
});
console.log(n + ' passed, 0 failed');
