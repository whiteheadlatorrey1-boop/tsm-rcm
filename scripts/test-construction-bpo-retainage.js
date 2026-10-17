'use strict';
// Hand-checked unit tests for server/construction-bpo/retainage.js.

const assert = require('assert');
const { computeJobRetainage, computeRetainageSchedule, DEFAULT_THRESHOLDS } = require('../server/construction-bpo/retainage');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('PASS: ' + name); }
  catch (e) { fail++; console.log('FAIL: ' + name + ': ' + e.message); }
}

t('default retainage variance threshold is 2% of billedToDate', () => {
  assert.strictEqual(DEFAULT_THRESHOLDS.retainageVariancePct, 0.02);
});

t('retainageHeld matches the contract-rate expectation exactly: zero variance, no flag', () => {
  // expected = 1,000,000 * 0.10 = 100,000; held = 100,000 -> variance 0
  const r = computeJobRetainage({ jobId: 'J1', billedToDate: 1000000, retainagePct: 0.10, retainageHeld: 100000 });
  assert.strictEqual(r.expectedRetainage, 100000);
  assert.strictEqual(r.variance, 0);
  assert.strictEqual(r.variancePctOfBilled, 0);
  assert.deepStrictEqual(r.flags, []);
});

t('small variance under the 2% threshold: no flag', () => {
  // expected = 500,000*0.10 = 50,000; held = 50,500 -> variance 500; 500/500,000 = 0.1% < 2%
  const r = computeJobRetainage({ jobId: 'J1', billedToDate: 500000, retainagePct: 0.10, retainageHeld: 50500 });
  assert.strictEqual(r.expectedRetainage, 50000);
  assert.strictEqual(r.variance, 500);
  assert.strictEqual(r.variancePctOfBilled, 0.1);
  assert.deepStrictEqual(r.flags, []);
});

t('variance over the 2% threshold flags RETAINAGE_VARIANCE', () => {
  // expected = 500,000*0.10 = 50,000; held = 40,000 -> variance -10,000; |−10,000|/500,000 = 2% exactly -- not over, use a bigger miss
  // held = 35,000 -> variance -15,000; 15,000/500,000 = 3% > 2%
  const r = computeJobRetainage({ jobId: 'J8', billedToDate: 500000, retainagePct: 0.10, retainageHeld: 35000 });
  assert.strictEqual(r.expectedRetainage, 50000);
  assert.strictEqual(r.variance, -15000);
  assert.strictEqual(r.variancePctOfBilled, 3);
  assert.strictEqual(r.flags.length, 1);
  assert.strictEqual(r.flags[0].type, 'RETAINAGE_VARIANCE');
  assert.strictEqual(r.flags[0].variance, -15000);
});

t('exactly at the 2% threshold does NOT flag -- strictly greater-than', () => {
  // expected = 500,000*0.10 = 50,000; held = 40,000 -> variance -10,000; 10,000/500,000 = 2% exactly
  const r = computeJobRetainage({ jobId: 'J1', billedToDate: 500000, retainagePct: 0.10, retainageHeld: 40000 });
  assert.strictEqual(r.expectedRetainage, 50000);
  assert.strictEqual(r.variancePctOfBilled, 2);
  assert.deepStrictEqual(r.flags, []);
});

t('retainageHeld higher than expected (over-withheld) also flags -- variance can be positive', () => {
  // expected = 50,000; held = 65,000 -> variance +15,000; 15,000/500,000 = 3%
  const r = computeJobRetainage({ jobId: 'J8', billedToDate: 500000, retainagePct: 0.10, retainageHeld: 65000 });
  assert.strictEqual(r.variance, 15000);
  assert.strictEqual(r.flags[0].type, 'RETAINAGE_VARIANCE');
});

t('a custom threshold overrides the 2% default', () => {
  const r = computeJobRetainage({ jobId: 'J1', billedToDate: 500000, retainagePct: 0.10, retainageHeld: 50500 }, { retainageVariancePct: 0.0005 });
  // variancePctOfBilled = 0.1% > 0.05% threshold
  assert.strictEqual(r.flags.length, 1);
});

t('missing retainageHeld: INCOMPLETE_DATA flag, expectedRetainage still computed, variance null', () => {
  const r = computeJobRetainage({ jobId: 'J7', billedToDate: 500000, retainagePct: 0.10 });
  assert.strictEqual(r.expectedRetainage, 50000);
  assert.strictEqual(r.variance, null);
  assert.strictEqual(r.flags.length, 1);
  assert.strictEqual(r.flags[0].type, 'INCOMPLETE_DATA');
  assert.deepStrictEqual(r.flags[0].missingFields, ['retainageHeld']);
});

t('missing billedToDate and retainagePct: everything derived stays null, missingFields lists both', () => {
  const r = computeJobRetainage({ jobId: 'J7', retainageHeld: 1000 });
  assert.strictEqual(r.expectedRetainage, null);
  assert.strictEqual(r.variance, null);
  assert.deepStrictEqual(r.flags[0].missingFields, ['billedToDate', 'retainagePct']);
});

t('retainagePct out of [0,1] range is treated as invalid (null), e.g. a percentage given as 10 instead of 0.10', () => {
  const r = computeJobRetainage({ jobId: 'J1', billedToDate: 100000, retainagePct: 10, retainageHeld: 10000 });
  assert.strictEqual(r.retainagePct, null);
  assert.strictEqual(r.expectedRetainage, null);
  assert.ok(r.flags.some((f) => f.type === 'INCOMPLETE_DATA' && f.missingFields.includes('retainagePct')));
});

t('computeRetainageSchedule maps over a list of jobs', () => {
  const results = computeRetainageSchedule([
    { jobId: 'J1', billedToDate: 1000000, retainagePct: 0.10, retainageHeld: 100000 },
    { jobId: 'J8', billedToDate: 500000, retainagePct: 0.10, retainageHeld: 35000 },
  ]);
  assert.strictEqual(results.length, 2);
  assert.deepStrictEqual(results[0].flags, []);
  assert.strictEqual(results[1].flags[0].type, 'RETAINAGE_VARIANCE');
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
