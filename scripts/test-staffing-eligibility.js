'use strict';
// Direct tests for evaluatePlacementEligibility (server/staffing-engine-service.js).
// The engine test stubs candidate lookup, so these branches need their own coverage.
const assert = require('assert');
const Module = require('module');

// The service requires 'mongodb' at load; connect() is lazy, so a stub is enough.
const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'mongodb') return { MongoClient: class {}, ObjectId: class {} };
  return origLoad.call(this, request, ...rest);
};
const { evaluatePlacementEligibility: ev } = require('../server/staffing-engine-service.js');
Module._load = origLoad;

let passed = 0, failed = 0;
function check(label, fn) {
  try { fn(); passed++; } catch (e) { failed++; console.log('  FAIL: ' + label + ' -> ' + e.message); }
}
const ok = (o) => Object.assign({ candidateId: 'c1', status: 'ready_for_placement', readinessScore: 85 }, o);

check('missing candidate -> candidate-not-found', () => {
  [null, undefined].forEach((c) => { const r = ev(c); assert.strictEqual(r.eligible, false); assert.strictEqual(r.reason, 'candidate-not-found'); });
});
check('missing candidateId -> candidate-id-missing', () => assert.strictEqual(ev(ok({ candidateId: '' })).reason, 'candidate-id-missing'));
check('sample data -> sample-candidate', () => {
  const r = ev(ok({ isSampleData: true })); assert.strictEqual(r.eligible, false); assert.strictEqual(r.reason, 'sample-candidate');
});
check('isSampleData false or absent is not blocked', () => {
  assert.strictEqual(ev(ok({ isSampleData: false })).eligible, true);
  assert.strictEqual(ev(ok()).eligible, true);
});
check('wrong status -> candidate-not-ready (status echoed)', () => {
  const r = ev(ok({ status: 'in_training' })); assert.strictEqual(r.reason, 'candidate-not-ready'); assert.strictEqual(r.status, 'in_training');
});
check('score below 70 -> readiness-below-threshold', () => {
  const r = ev(ok({ readinessScore: 69 })); assert.strictEqual(r.eligible, false);
  assert.strictEqual(r.reason, 'readiness-below-threshold'); assert.strictEqual(r.minimumReadiness, 70); assert.strictEqual(r.readinessScore, 69);
});
check('score exactly 70 is eligible (inclusive threshold)', () => assert.strictEqual(ev(ok({ readinessScore: 70 })).eligible, true));
check('non-numeric / missing score is ineligible with null score', () => {
  ['abc', undefined].forEach((s) => { const r = ev(ok({ readinessScore: s })); assert.strictEqual(r.eligible, false); assert.strictEqual(r.readinessScore, null); });
});
check('null / blank score is ineligible (never treated as eligible)', () => {
  [null, ''].forEach((s) => assert.strictEqual(ev(ok({ readinessScore: s })).eligible, false));
});
check('custom minimumReadiness is honored', () => {
  assert.strictEqual(ev(ok({ readinessScore: 60 }), { minimumReadiness: 50 }).eligible, true);
  assert.strictEqual(ev(ok({ readinessScore: 85 }), { minimumReadiness: 90 }).eligible, false);
});
check('eligible result carries reason and score', () => {
  const r = ev(ok()); assert.deepStrictEqual(r, { eligible: true, reason: 'eligible', readinessScore: 85 });
});
check('check order: sample-candidate wins over not-ready and low score', () => {
  assert.strictEqual(ev(ok({ isSampleData: true, status: 'x', readinessScore: 1 })).reason, 'sample-candidate');
});

console.log('STAFFING ELIGIBILITY: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
