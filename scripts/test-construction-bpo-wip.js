'use strict';
// Hand-checked unit tests for server/construction-bpo/wip.js's per-job WIP
// calculations and flags. Every expected number below was computed by hand
// (shown in each test's comment), not copied from the implementation.

const assert = require('assert');
const { computeJobWip, computeWipSchedule } = require('../server/construction-bpo/wip');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('PASS: ' + name); }
  catch (e) { fail++; console.log('FAIL: ' + name + ': ' + e.message); }
}

// ---- core math, no flags -------------------------------------------------

t('core math: 95% complete, small overbilling under threshold, no flags', () => {
  // costsToDate/totalEstimatedCost = 950000/1000000 = 95% -> percentComplete 95
  // earnedRevenue = 0.95 * 1200000 = 1,140,000
  // overUnderBilling = billedToDate(1,150,000) - earnedRevenue(1,140,000) = 10,000 (overbilled)
  // variancePct = 10,000/1,200,000 = 0.833% -- under the 10% threshold, no flag
  // projectedProfit = 1,200,000 - 1,000,000 = 200,000; margin = 200,000/1,200,000 = 16.666...% -> 16.67
  const r = computeJobWip({ jobId: 'J1', costsToDate: 950000, totalEstimatedCost: 1000000, contractValue: 1200000, billedToDate: 1150000 });
  assert.strictEqual(r.percentComplete, 95);
  assert.strictEqual(r.earnedRevenue, 1140000);
  assert.strictEqual(r.costToComplete, 50000);
  assert.strictEqual(r.overUnderBilling, 10000);
  assert.strictEqual(r.projectedProfit, 200000);
  assert.strictEqual(r.projectedMarginPct, 16.67);
  assert.strictEqual(r.physicalProgressStatus, 'not_provided');
  assert.deepStrictEqual(r.flags, []);
});

// ---- COST_OVERRUN trigger A: cost-ratio + PM-reported physical progress --

t('COST_OVERRUN trigger A fires: costs>90% of estimate AND physical progress<85%', () => {
  // costsToDate/totalEstimatedCost = 920000/1000000 = 92% > 90% threshold
  // physicalPercentComplete = 70 < 85% threshold -> both conditions true
  const r = computeJobWip({
    jobId: 'J2', costsToDate: 920000, totalEstimatedCost: 1000000, contractValue: 1200000, billedToDate: 900000,
    physicalPercentComplete: 70,
  });
  assert.strictEqual(r.physicalPercentComplete, 70);
  assert.strictEqual(r.physicalProgressStatus, 'provided');
  const flag = r.flags.find((f) => f.type === 'COST_OVERRUN' && f.reason === 'cost_vs_physical_progress');
  assert.ok(flag, 'expected a cost_vs_physical_progress COST_OVERRUN flag');
  assert.strictEqual(flag.costPct, 92);
  assert.strictEqual(flag.physicalPercentComplete, 70);
});

t('COST_OVERRUN trigger A does NOT use cost-based percentComplete as a substitute for physical progress', () => {
  // Regression guard for the bug this correction fixes: costsToDate/estimate
  // is 92% (>90%) and percentComplete is therefore ALSO 92 (>=85%) -- if the
  // implementation mistakenly fell back to percentComplete instead of
  // requiring physicalPercentComplete, the condition "percentComplete<85"
  // would correctly stay false here too, so this case alone can't prove the
  // fix. The real regression guard is the next test: physicalPercentComplete
  // explicitly LOWER than percentComplete, which the old (buggy) comparison
  // against percentComplete could never satisfy simultaneously with
  // costPct>90, but the corrected comparison against physicalPercentComplete
  // can.
  const r = computeJobWip({
    jobId: 'J2b', costsToDate: 920000, totalEstimatedCost: 1000000, contractValue: 1200000, billedToDate: 900000,
    physicalPercentComplete: 92, // matches cost-ratio exactly, still >=85 -- no flag
  });
  assert.strictEqual(r.flags.some((f) => f.type === 'COST_OVERRUN' && f.reason === 'cost_vs_physical_progress'), false);
});

t('COST_OVERRUN trigger A: physical progress lower than cost-ratio fires correctly (the case the old dead condition could never reach)', () => {
  // costPct = 92% (>90), physicalPercentComplete = 40 (<85) -- under the old
  // buggy code (which compared costPct>90 AND percentComplete<85, where
  // percentComplete IS costPct), this combination of ">90 AND <85 on the
  // SAME number" was mathematically impossible, so the flag could never
  // fire at all. With physicalPercentComplete as an independent PM-reported
  // signal, it fires exactly when it should.
  const r = computeJobWip({
    jobId: 'J2c', costsToDate: 920000, totalEstimatedCost: 1000000, contractValue: 1200000, billedToDate: 900000,
    physicalPercentComplete: 40,
  });
  const flag = r.flags.find((f) => f.type === 'COST_OVERRUN' && f.reason === 'cost_vs_physical_progress');
  assert.ok(flag, 'expected the flag to fire -- this is exactly the case the old dead condition could never reach');
});

t('COST_OVERRUN trigger A does not fire when physicalPercentComplete is missing, even if cost-ratio alone would suggest it', () => {
  // costPct = 95% (>90%) but physicalPercentComplete is not provided --
  // never inferred, so the trigger cannot evaluate and does not fire.
  const r = computeJobWip({ jobId: 'J3', costsToDate: 950000, totalEstimatedCost: 1000000, contractValue: 1200000, billedToDate: 900000 });
  assert.strictEqual(r.physicalPercentComplete, null);
  assert.strictEqual(r.physicalProgressStatus, 'not_provided');
  assert.strictEqual(r.flags.some((f) => f.type === 'COST_OVERRUN'), false);
});

t('COST_OVERRUN trigger A does not fire when physical progress is healthy (>=85%) even with high cost-ratio', () => {
  const r = computeJobWip({
    jobId: 'J4', costsToDate: 950000, totalEstimatedCost: 1000000, contractValue: 1200000, billedToDate: 900000,
    physicalPercentComplete: 90,
  });
  assert.strictEqual(r.flags.some((f) => f.type === 'COST_OVERRUN' && f.reason === 'cost_vs_physical_progress'), false);
});

// ---- COST_OVERRUN trigger B: revised EAC exceeds original budget --------

t('COST_OVERRUN trigger B fires: revised estimate-at-completion exceeds the original budget', () => {
  // originalBudget 1,000,000; totalEstimatedCost (revised EAC) 1,150,000
  // -> overage 150,000, overagePct 15%
  const r = computeJobWip({
    jobId: 'J5', costsToDate: 500000, totalEstimatedCost: 1150000, contractValue: 1300000, billedToDate: 500000,
    originalBudget: 1000000, physicalPercentComplete: 95, // healthy progress -- trigger A should NOT also fire
  });
  const flag = r.flags.find((f) => f.type === 'COST_OVERRUN' && f.reason === 'eac_exceeds_original_budget');
  assert.ok(flag, 'expected an eac_exceeds_original_budget COST_OVERRUN flag');
  assert.strictEqual(flag.overageAmount, 150000);
  assert.strictEqual(flag.overagePct, 15);
  assert.strictEqual(r.flags.some((f) => f.reason === 'cost_vs_physical_progress'), false);
});

t('COST_OVERRUN trigger B does not fire when revised EAC is within the original budget', () => {
  const r = computeJobWip({
    jobId: 'J6', costsToDate: 500000, totalEstimatedCost: 950000, contractValue: 1300000, billedToDate: 500000,
    originalBudget: 1000000,
  });
  assert.strictEqual(r.flags.some((f) => f.reason === 'eac_exceeds_original_budget'), false);
});

t('COST_OVERRUN trigger B does not fire when originalBudget is not provided', () => {
  const r = computeJobWip({ jobId: 'J7', costsToDate: 500000, totalEstimatedCost: 1150000, contractValue: 1300000, billedToDate: 500000 });
  assert.strictEqual(r.flags.some((f) => f.reason === 'eac_exceeds_original_budget'), false);
});

t('both COST_OVERRUN triggers can fire independently on the same job', () => {
  const r = computeJobWip({
    jobId: 'J8', costsToDate: 1100000, totalEstimatedCost: 1150000, contractValue: 1300000, billedToDate: 900000,
    originalBudget: 1000000, physicalPercentComplete: 50,
  });
  const reasons = r.flags.filter((f) => f.type === 'COST_OVERRUN').map((f) => f.reason).sort();
  assert.deepStrictEqual(reasons, ['cost_vs_physical_progress', 'eac_exceeds_original_budget']);
});

// ---- OVERBILLED / UNDERBILLED / LOW_MARGIN / INCOMPLETE_DATA (unchanged) -

t('OVERBILLED fires when billed exceeds earned by more than 10% of contract', () => {
  // earnedRevenue = 0.5*1000000=500000; billed=750000; variance=250000/1000000=25%
  const r = computeJobWip({ jobId: 'J9', costsToDate: 500000, totalEstimatedCost: 1000000, contractValue: 1000000, billedToDate: 750000 });
  const flag = r.flags.find((f) => f.type === 'OVERBILLED');
  assert.ok(flag);
  assert.strictEqual(flag.overUnderBilling, 250000);
  assert.strictEqual(flag.variancePct, 25);
});

t('UNDERBILLED fires when earned exceeds billed by more than 10% of contract', () => {
  // earnedRevenue=800000; billed=400000; overUnderBilling = 400000-800000 = -400000; variance 40%
  const r = computeJobWip({ jobId: 'J10', costsToDate: 800000, totalEstimatedCost: 1000000, contractValue: 1000000, billedToDate: 400000 });
  const flag = r.flags.find((f) => f.type === 'UNDERBILLED');
  assert.ok(flag);
  assert.strictEqual(flag.overUnderBilling, -400000);
  assert.strictEqual(flag.variancePct, 40);
});

t('LOW_MARGIN fires when projected margin is under 5%', () => {
  // projectedProfit = 1000000-970000=30000; margin=3%
  const r = computeJobWip({ jobId: 'J11', costsToDate: 500000, totalEstimatedCost: 970000, contractValue: 1000000, billedToDate: 500000 });
  const flag = r.flags.find((f) => f.type === 'LOW_MARGIN');
  assert.ok(flag);
  assert.strictEqual(flag.projectedMarginPct, 3);
});

t('INCOMPLETE_DATA fires when a job is listed but never given an estimate', () => {
  const r = computeJobWip({ jobId: 'J12', contractValue: 1000000 });
  const flag = r.flags.find((f) => f.type === 'INCOMPLETE_DATA');
  assert.ok(flag);
  assert.ok(flag.missingFields.includes('totalEstimatedCost'));
  assert.ok(flag.missingFields.includes('costsToDate'));
  assert.strictEqual(r.percentComplete, null);
  assert.strictEqual(r.earnedRevenue, null);
});

t('a non-numeric physicalPercentComplete is treated as not provided, never coerced', () => {
  const r = computeJobWip({ jobId: 'J13', costsToDate: 950000, totalEstimatedCost: 1000000, contractValue: 1000000, billedToDate: 900000, physicalPercentComplete: 'mostly done' });
  assert.strictEqual(r.physicalPercentComplete, null);
  assert.strictEqual(r.physicalProgressStatus, 'not_provided');
});

t('jobId is required', () => {
  assert.throws(() => computeJobWip({ costsToDate: 1 }), /jobId/);
});

t('computeWipSchedule maps over every job and requires an array', () => {
  const rows = computeWipSchedule([
    { jobId: 'A', costsToDate: 100, totalEstimatedCost: 200, contractValue: 300, billedToDate: 100 },
    { jobId: 'B', costsToDate: 50, totalEstimatedCost: 100, contractValue: 150, billedToDate: 50 },
  ]);
  assert.strictEqual(rows.length, 2);
  assert.deepStrictEqual(rows.map((r) => r.jobId), ['A', 'B']);
  assert.throws(() => computeWipSchedule('not an array'), /array/);
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
