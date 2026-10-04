'use strict';
// A+ practice-session events must be mapped to a readiness dimension,
// otherwise the registry stores them but the coverage gate ignores them.
const assert = require('assert');
const path = require('path');
const model = require(path.join(__dirname, '..', 'server', 'readiness', 'professional-readiness-model.js'));

let passed = 0, failed = 0;
const check = (label, fn) => {
  try { fn(); passed++; } catch (e) { failed++; console.log('  FAIL: ' + label + ' -> ' + e.message); }
};

const events = [{
  type: 'aplus_practice_session', score: 75, weight: 1,
  meta: { correct: 6, total: 8, objective: 'test', source: 'aplus_practice' },
}];
const r = model.assessProfessionalReadiness(events);

check('event type is mapped (not in ignored.unmapped)', () =>
  assert.ok(!r.ignored.unmapped.includes('aplus_practice_session'), 'unmapped: ' + JSON.stringify(r.ignored.unmapped)));
check('technical dimension is assessed', () =>
  assert.strictEqual(r.dimensions.technical.status, 'assessed'));
check('exactly one dimension assessed (knowledge events only inform technical)', () =>
  assert.strictEqual(r.overall.assessedDimensions.length, 1));

console.log('A+ READINESS MAPPING: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
