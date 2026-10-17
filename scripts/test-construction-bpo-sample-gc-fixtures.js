'use strict';
// Hand-checked acceptance test for the "Sample GC" demo fixture
// (server/construction-bpo/fixtures/sample-gc.js): runs all 4 weeks
// through the real buildWeeklyReportDraft() combination layer and asserts
// the exact flag set each week is supposed to produce, per job and per
// sub-ledger. This is what proves the fixture actually exercises every
// condition it claims to (both COST_OVERRUN triggers, over/underbilled,
// low margin, incomplete data, progress-not-provided, 3 stalled COs,
// retainage variance, 2 missing + 1 short lien waiver) -- not just that
// the numbers look plausible.

const assert = require('assert');
const { buildWeeklyReportDraft } = require('../server/construction-bpo/weekly-report');
const { CLIENT_ID, WEEK_ENDINGS, buildWeekInput, buildAllWeeks } = require('../server/construction-bpo/fixtures/sample-gc');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('PASS: ' + name); }
  catch (e) { fail++; console.log('FAIL: ' + name + ': ' + e.message); }
}

// WIP-level (per-job cost/billing/margin) flags only -- not the
// change-order/retainage/lien-waiver sub-ledgers, which share jobId but are
// asserted separately below and would otherwise pollute this set (e.g.
// J-108 picks up RETAINAGE_VARIANCE and LIEN_WAIVER_SHORT via its jobId).
function jobFlagTypes(report, jobId) {
  return jobByWip(report, jobId).flags.map((f) => f.type).sort();
}
function jobByWip(report, jobId) {
  return report.jobs.find((j) => j.jobId === jobId);
}

t('buildAllWeeks returns 4 inputs matching WEEK_ENDINGS, all for CLIENT_ID', () => {
  const weeks = buildAllWeeks();
  assert.strictEqual(weeks.length, 4);
  weeks.forEach((w, i) => {
    assert.strictEqual(w.clientId, CLIENT_ID);
    assert.strictEqual(w.weekEnding, WEEK_ENDINGS[i]);
    assert.strictEqual(w.jobs.length, 8);
  });
});

t('weekIndex out of range throws', () => {
  assert.throws(() => buildWeekInput(4), /weekIndex/);
  assert.throws(() => buildWeekInput(-1), /weekIndex/);
});

// ── Week 1 (index 0): billing/margin/incomplete/retainage/waivers present, nothing age-dependent yet ──
t('week 1: both COST_OVERRUN jobs are still clean (not yet breached)', () => {
  const r = buildWeeklyReportDraft(buildWeekInput(0));
  assert.deepStrictEqual(jobFlagTypes(r, 'J-101'), []);
  assert.deepStrictEqual(jobFlagTypes(r, 'J-102'), []);
});

t('week 1: OVERBILLED (J-103), UNDERBILLED (J-104), LOW_MARGIN (J-105), INCOMPLETE_DATA (J-106)', () => {
  const r = buildWeeklyReportDraft(buildWeekInput(0));
  assert.deepStrictEqual(jobFlagTypes(r, 'J-103'), ['OVERBILLED']);
  assert.deepStrictEqual(jobFlagTypes(r, 'J-104'), ['UNDERBILLED']);
  assert.deepStrictEqual(jobFlagTypes(r, 'J-105'), ['LOW_MARGIN']);
  assert.deepStrictEqual(jobFlagTypes(r, 'J-106'), ['INCOMPLETE_DATA']);
});

t('week 1: J-107 has physicalProgressStatus not_provided and zero flags', () => {
  const r = buildWeeklyReportDraft(buildWeekInput(0));
  const j107 = jobByWip(r, 'J-107');
  assert.strictEqual(j107.physicalProgressStatus, 'not_provided');
  assert.deepStrictEqual(jobFlagTypes(r, 'J-107'), []);
});

t('week 1: J-108 is clean on the WIP side (retainage variance is its own sub-ledger, asserted separately)', () => {
  const r = buildWeeklyReportDraft(buildWeekInput(0));
  assert.deepStrictEqual(jobFlagTypes(r, 'J-108'), []);
});

t('week 1: no change orders stalled yet (56h old, under the 72h SLA)', () => {
  const r = buildWeeklyReportDraft(buildWeekInput(0));
  assert.strictEqual(r.summary.stalledChangeOrders, 0);
  assert.strictEqual(r.changeOrders.filter((c) => c.isStalled).length, 0);
});

t('week 1: retainage variance on J-108, lien waivers 2 missing + 1 short', () => {
  const r = buildWeeklyReportDraft(buildWeekInput(0));
  assert.strictEqual(r.summary.retainageVariances, 1);
  assert.ok(r.retainage[0].flags.some((f) => f.type === 'RETAINAGE_VARIANCE'));

  const statuses = r.lienWaivers.map((w) => w.status).sort();
  assert.deepStrictEqual(statuses, ['missing', 'missing', 'short']);
  assert.strictEqual(r.summary.lienWaiverIssues, 3);
});

// ── Weeks 2-4 (index 1-3): both COST_OVERRUN triggers fire, all 3 COs stalled ──
for (let weekIndex = 1; weekIndex <= 3; weekIndex++) {
  const label = 'week ' + (weekIndex + 1);

  t(label + ': COST_OVERRUN trigger A fires on J-101 (cost_vs_physical_progress)', () => {
    const r = buildWeeklyReportDraft(buildWeekInput(weekIndex));
    const flags = r.flags.filter((f) => f.jobId === 'J-101' && f.type === 'COST_OVERRUN');
    assert.strictEqual(flags.length, 1);
    assert.strictEqual(flags[0].reason, 'cost_vs_physical_progress');
  });

  t(label + ': COST_OVERRUN trigger B fires on J-102 (eac_exceeds_original_budget)', () => {
    const r = buildWeeklyReportDraft(buildWeekInput(weekIndex));
    const flags = r.flags.filter((f) => f.jobId === 'J-102' && f.type === 'COST_OVERRUN');
    assert.strictEqual(flags.length, 1);
    assert.strictEqual(flags[0].reason, 'eac_exceeds_original_budget');
  });

  t(label + ': all 3 change orders are stalled (CO-301, CO-302, CO-303)', () => {
    const r = buildWeeklyReportDraft(buildWeekInput(weekIndex));
    assert.strictEqual(r.summary.stalledChangeOrders, 3);
    const stalledIds = r.changeOrders.filter((c) => c.isStalled).map((c) => c.id).sort();
    assert.deepStrictEqual(stalledIds, ['CO-301', 'CO-302', 'CO-303']);
  });

  t(label + ': billing/margin/incomplete/retainage/waivers still present', () => {
    const r = buildWeeklyReportDraft(buildWeekInput(weekIndex));
    assert.deepStrictEqual(jobFlagTypes(r, 'J-103'), ['OVERBILLED']);
    assert.deepStrictEqual(jobFlagTypes(r, 'J-104'), ['UNDERBILLED']);
    assert.deepStrictEqual(jobFlagTypes(r, 'J-105'), ['LOW_MARGIN']);
    assert.deepStrictEqual(jobFlagTypes(r, 'J-106'), ['INCOMPLETE_DATA']);
    assert.strictEqual(r.summary.retainageVariances, 1);
    assert.strictEqual(r.summary.lienWaiverIssues, 3);
  });

  t(label + ': J-107 stays flag-free and not_provided throughout', () => {
    const r = buildWeeklyReportDraft(buildWeekInput(weekIndex));
    assert.strictEqual(jobByWip(r, 'J-107').physicalProgressStatus, 'not_provided');
    assert.deepStrictEqual(jobFlagTypes(r, 'J-107'), []);
  });
}

t('every job is covered by exactly one of the intended conditions, with J-108 doubling as the retainage + short-waiver + stalled-CO host', () => {
  const r = buildWeeklyReportDraft(buildWeekInput(2)); // a week where everything age-dependent has fired
  const flagged = new Set(r.flags.map((f) => f.jobId));
  assert.deepStrictEqual(
    [...flagged].sort(),
    ['J-101', 'J-102', 'J-103', 'J-104', 'J-105', 'J-106', 'J-108']
  );
  assert.ok(!flagged.has('J-107'), 'J-107 is the deliberately clean/not_provided job');
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
