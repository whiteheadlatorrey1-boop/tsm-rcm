'use strict';
// Hand-checked unit tests for server/construction-bpo/weekly-report.js --
// the pure compute layer that combines wip/change-orders/retainage/
// lien-waivers into one draft report. No storage, auth, or review-gate
// logic lives here (that's routes/construction-bpo.js), so this just
// checks the combination itself: every engine ran, flags were flattened
// and counted correctly, and summary totals are right.

const assert = require('assert');
const { buildWeeklyReportDraft } = require('../server/construction-bpo/weekly-report');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('PASS: ' + name); }
  catch (e) { fail++; console.log('FAIL: ' + name + ': ' + e.message); }
}

t('requires clientId and weekEnding', () => {
  assert.throws(() => buildWeeklyReportDraft({ weekEnding: '2026-01-10' }), /clientId/);
  assert.throws(() => buildWeeklyReportDraft({ clientId: 'c1' }), /weekEnding/);
});

t('empty input: a valid empty-but-complete draft, no flags', () => {
  const r = buildWeeklyReportDraft({ clientId: 'c1', weekEnding: '2026-01-10' });
  assert.strictEqual(r.clientId, 'c1');
  assert.strictEqual(r.weekEnding, '2026-01-10');
  assert.strictEqual(r.status, 'draft');
  assert.deepStrictEqual(r.jobs, []);
  assert.deepStrictEqual(r.flags, []);
  assert.deepStrictEqual(r.flagCounts, {});
  assert.strictEqual(r.summary.jobCount, 0);
  assert.strictEqual(r.summary.totalEarnedRevenue, null);
});

t('a healthy job with no flags: jobsWithFlags stays 0, totals reflect its numbers', () => {
  const r = buildWeeklyReportDraft({
    clientId: 'c1', weekEnding: '2026-01-10',
    jobs: [{ jobId: 'J1', costsToDate: 500000, totalEstimatedCost: 1000000, contractValue: 1200000, billedToDate: 580000 }],
  });
  // percentComplete 50, earnedRevenue 600,000, overUnderBilling = 580,000-600,000 = -20,000
  assert.strictEqual(r.summary.jobCount, 1);
  assert.strictEqual(r.summary.jobsWithFlags, 0);
  assert.strictEqual(r.summary.totalEarnedRevenue, 600000);
  assert.strictEqual(r.summary.totalOverUnderBilling, -20000);
  assert.deepStrictEqual(r.flags, []);
});

t('flags from every engine are flattened into one array and counted in flagCounts', () => {
  const r = buildWeeklyReportDraft({
    clientId: 'c1', weekEnding: '2026-01-10', asOf: '2026-01-10T00:00:00.000Z',
    jobs: [
      { jobId: 'J1', costsToDate: 950000, totalEstimatedCost: 1000000, contractValue: 1000000, billedToDate: 950000, physicalPercentComplete: 50 }, // COST_OVERRUN trigger A + LOW_MARGIN (margin 0)
    ],
    changeOrders: [{ id: 'CO1', jobId: 'J1', status: 'pending', submittedAt: '2026-01-01T00:00:00.000Z' }], // 9 days -> stalled
    retainage: [{ jobId: 'J1', billedToDate: 500000, retainagePct: 0.10, retainageHeld: 20000 }], // expected 50,000, variance -30,000 -> 6% > 2%
    lienWaivers: [{ jobId: 'J1', subcontractor: 'Sub A', expectedAmount: 10000, waiver: null }], // missing
  });
  const types = r.flags.map((f) => f.type).sort();
  assert.ok(types.includes('COST_OVERRUN'), 'wip COST_OVERRUN flag present');
  assert.ok(types.includes('LOW_MARGIN'), 'wip LOW_MARGIN flag present');
  assert.ok(types.includes('SLA_BREACH'), 'change-order SLA_BREACH flag present');
  assert.ok(types.includes('RETAINAGE_VARIANCE'), 'retainage RETAINAGE_VARIANCE flag present');
  assert.ok(types.includes('LIEN_WAIVER_MISSING'), 'lien-waiver MISSING flag present');
  assert.strictEqual(r.flagCounts.SLA_BREACH, 1);
  assert.strictEqual(r.flagCounts.LIEN_WAIVER_MISSING, 1);
  assert.strictEqual(r.summary.jobsWithFlags, 1, 'all flags here share jobId J1 -- one job with flags');
  assert.strictEqual(r.summary.stalledChangeOrders, 1);
  assert.strictEqual(r.summary.retainageVariances, 1);
  assert.strictEqual(r.summary.lienWaiverIssues, 1);
});

t('jobsWithFlags counts distinct jobIds, not total flag count', () => {
  const r = buildWeeklyReportDraft({
    clientId: 'c1', weekEnding: '2026-01-10',
    jobs: [
      // two different flag-triggering conditions on the SAME job: LOW_MARGIN and OVERBILLED
      { jobId: 'J1', costsToDate: 950000, totalEstimatedCost: 1000000, contractValue: 1000000, billedToDate: 950000 },
    ],
  });
  const jobIds = new Set(r.flags.map((f) => f.jobId));
  assert.strictEqual(jobIds.size, 1);
  assert.strictEqual(r.summary.jobsWithFlags, 1);
});

t('always starts as status draft, carries a generatedAt timestamp', () => {
  const r = buildWeeklyReportDraft({ clientId: 'c1', weekEnding: '2026-01-10' });
  assert.strictEqual(r.status, 'draft');
  assert.ok(typeof r.generatedAt === 'string' && !Number.isNaN(new Date(r.generatedAt).getTime()));
});

t('thresholds are passed through to each engine', () => {
  const r = buildWeeklyReportDraft(
    { clientId: 'c1', weekEnding: '2026-01-10', asOf: '2026-01-10T00:00:00.000Z', changeOrders: [{ id: 'CO1', jobId: 'J1', status: 'pending', submittedAt: '2026-01-09T12:00:00.000Z' }] }, // 12h old
    { slaHours: 10 } // custom SLA -> stalled at 12h
  );
  assert.strictEqual(r.changeOrders[0].isStalled, true);
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
