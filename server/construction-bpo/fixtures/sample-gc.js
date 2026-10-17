'use strict';

/**
 * Construction BPO: "Sample GC" demo fixture.
 *
 * 8 jobs, 4 consecutive weekly reports (weekEnding Fri 2026-01-09 through
 * 2026-01-30), hand-built so each job demonstrates exactly one condition
 * this service's engines (wip.js, change-orders.js, retainage.js,
 * lien-waivers.js) are meant to catch, with everything else on that job
 * kept clean on purpose -- this is a demo/test fixture, not a realistic
 * portfolio, so flags should never show up by accident on the "wrong" job.
 *
 * Covered, deliberately, across the 4 weeks (see
 * scripts/test-construction-bpo-sample-gc-fixtures.js for the asserted
 * expectations):
 *   - J-101 COST_OVERRUN trigger A (cost_vs_physical_progress) -- starts
 *     clean in week 1, fires from week 2 onward as costsToDate crosses 90%
 *     of estimate while PM-reported physical completion lags.
 *   - J-102 COST_OVERRUN trigger B (eac_exceeds_original_budget) -- same
 *     week-1-clean/week-2-onward-fires shape, independent trigger.
 *   - J-103 OVERBILLED, all 4 weeks.
 *   - J-104 UNDERBILLED, all 4 weeks. Also carries one of the two missing
 *     lien waivers.
 *   - J-105 LOW_MARGIN, all 4 weeks (contractValue vs. totalEstimatedCost
 *     never changes week to week, so this is constant by construction).
 *     Also carries the second missing lien waiver.
 *   - J-106 INCOMPLETE_DATA, all 4 weeks (totalEstimatedCost never
 *     supplied -- an analyst correcting this is exactly the point of the
 *     workbench review step, not something this fixture resolves for them).
 *   - J-107 physical progress not provided (physicalProgressStatus stays
 *     'not_provided') but otherwise clean -- demonstrates that condition is
 *     distinct from any flag: no flags fire for this job, ever.
 *   - J-108 a clean baseline job that hosts the RETAINAGE_VARIANCE (all 4
 *     weeks) and the one SHORT lien waiver; also the jobId for one of the
 *     3 change orders that go stalled.
 *
 * Change orders: 3 total (CO-301/J-101, CO-302/J-103, CO-303/J-108), all
 * submitted 2026-01-08 and left pending throughout. Week 1's asOf is only
 * ~56h after that -- under the 72h default SLA, so none are stalled yet.
 * By week 2's asOf (~224h) all 3 have breached and stay breached through
 * week 4 -- the "3 stalled COs" the spec calls for only show up once the
 * report has run long enough to catch them, which is the actual point of
 * running this weekly rather than once.
 *
 * Lien waivers: LW-104 (J-104, sub "ABC Framing") and LW-105 (J-105, sub
 * "XYZ Drywall") have no waiver on file at all (MISSING) every week.
 * LW-108 (J-108, sub "Precision Concrete") has a waiver on file for less
 * than the expected amount (SHORT) every week.
 */

const CLIENT_ID = 'sample-gc';

const WEEK_ENDINGS = ['2026-01-09', '2026-01-16', '2026-01-23', '2026-01-30'];
const AS_OF = WEEK_ENDINGS.map((d) => d + 'T17:00:00.000Z');

// ─────────────────────────────── jobs ────────────────────────────────────
// Each entry: a static shape (name, contractValue, totalEstimatedCost,
// etc.) plus one array of 4 values per week-varying field.

const JOBS = [
  {
    jobId: 'J-101', jobName: 'Foundation Package',
    contractValue: 1100000, totalEstimatedCost: 1000000,
    costsToDate: [850000, 920000, 960000, 990000],
    billedToDate: [930000, 1010000, 1050000, 1080000],
    physicalPercentComplete: [70, 74, 77, 80],
  },
  {
    jobId: 'J-102', jobName: 'MEP Rough-In',
    contractValue: 1000000, originalBudget: 800000,
    totalEstimatedCost: [780000, 820000, 860000, 900000],
    costsToDate: [300000, 450000, 600000, 750000],
    billedToDate: [380000, 545000, 695000, 830000],
  },
  {
    jobId: 'J-103', jobName: 'Structural Steel',
    contractValue: 2200000, totalEstimatedCost: 2000000,
    costsToDate: [400000, 700000, 1000000, 1300000],
    billedToDate: [700000, 1050000, 1380000, 1700000],
  },
  {
    jobId: 'J-104', jobName: 'Site Utilities',
    contractValue: 650000, totalEstimatedCost: 600000,
    costsToDate: [300000, 360000, 420000, 480000],
    billedToDate: [250000, 300000, 350000, 400000],
  },
  {
    jobId: 'J-105', jobName: 'Interior Finishes',
    contractValue: 500000, totalEstimatedCost: 480000,
    costsToDate: [100000, 220000, 340000, 460000],
    billedToDate: [100000, 225000, 350000, 475000],
  },
  {
    jobId: 'J-106', jobName: 'Roofing',
    contractValue: 700000, // totalEstimatedCost deliberately never supplied
    costsToDate: [150000, 220000, 300000, 380000],
    billedToDate: [160000, 230000, 310000, 390000],
  },
  {
    jobId: 'J-107', jobName: 'Landscaping',
    contractValue: 330000, totalEstimatedCost: 300000,
    costsToDate: [60000, 120000, 180000, 240000],
    billedToDate: [65000, 130000, 195000, 260000],
    // physicalPercentComplete deliberately never supplied
  },
  {
    jobId: 'J-108', jobName: 'Parking Structure',
    contractValue: 990000, totalEstimatedCost: 900000,
    costsToDate: [150000, 300000, 450000, 600000],
    billedToDate: [160000, 325000, 490000, 655000],
  },
];

function pick(field, weekIndex) {
  return Array.isArray(field) ? field[weekIndex] : field;
}

function jobForWeek(spec, weekIndex) {
  const job = {
    jobId: spec.jobId,
    jobName: spec.jobName,
    contractValue: pick(spec.contractValue, weekIndex),
    costsToDate: pick(spec.costsToDate, weekIndex),
    billedToDate: pick(spec.billedToDate, weekIndex),
  };
  if (spec.totalEstimatedCost !== undefined) job.totalEstimatedCost = pick(spec.totalEstimatedCost, weekIndex);
  if (spec.originalBudget !== undefined) job.originalBudget = pick(spec.originalBudget, weekIndex);
  if (spec.physicalPercentComplete !== undefined) job.physicalPercentComplete = pick(spec.physicalPercentComplete, weekIndex);
  return job;
}

// ───────────────────────── change orders ─────────────────────────────────

const CHANGE_ORDERS = [
  { id: 'CO-301', jobId: 'J-101', title: 'Added footing reinforcement', amount: 42000, status: 'pending', submittedAt: '2026-01-08T09:00:00.000Z' },
  { id: 'CO-302', jobId: 'J-103', title: 'Revised steel connection detail', amount: 118000, status: 'pending', submittedAt: '2026-01-08T09:00:00.000Z' },
  { id: 'CO-303', jobId: 'J-108', title: 'Relocate retaining wall drainage', amount: 31000, status: 'pending', submittedAt: '2026-01-08T09:00:00.000Z' },
];

// ──────────────────────────── retainage ──────────────────────────────────

const RETAINAGE = {
  jobId: 'J-108',
  retainagePct: 0.10,
  retainageHeld: [8000, 16000, 24000, 32000],
};

function retainageForWeek(weekIndex) {
  return {
    jobId: RETAINAGE.jobId,
    billedToDate: pick(JOBS.find((j) => j.jobId === RETAINAGE.jobId).billedToDate, weekIndex),
    retainagePct: RETAINAGE.retainagePct,
    retainageHeld: RETAINAGE.retainageHeld[weekIndex],
  };
}

// ─────────────────────────── lien waivers ────────────────────────────────

function lienWaiversForWeek(weekIndex) {
  const payPeriod = WEEK_ENDINGS[weekIndex];
  return [
    { jobId: 'J-104', subcontractor: 'ABC Framing', payPeriod, expectedAmount: 45000, waiver: null },
    { jobId: 'J-105', subcontractor: 'XYZ Drywall', payPeriod, expectedAmount: 28000, waiver: null },
    { jobId: 'J-108', subcontractor: 'Precision Concrete', payPeriod, expectedAmount: 50000, waiver: { receivedAmount: 40000 } },
  ];
}

// ───────────────────────────── assembly ──────────────────────────────────

/** buildWeekInput(weekIndex) -> input object for buildWeeklyReportDraft(), for weekIndex 0-3. */
function buildWeekInput(weekIndex) {
  if (!Number.isInteger(weekIndex) || weekIndex < 0 || weekIndex >= WEEK_ENDINGS.length) {
    throw new Error('weekIndex must be 0-' + (WEEK_ENDINGS.length - 1));
  }
  return {
    clientId: CLIENT_ID,
    weekEnding: WEEK_ENDINGS[weekIndex],
    asOf: AS_OF[weekIndex],
    jobs: JOBS.map((spec) => jobForWeek(spec, weekIndex)),
    changeOrders: CHANGE_ORDERS,
    retainage: [retainageForWeek(weekIndex)],
    lienWaivers: lienWaiversForWeek(weekIndex),
  };
}

/** buildAllWeeks() -> array of 4 input objects, one per WEEK_ENDINGS entry. */
function buildAllWeeks() {
  return WEEK_ENDINGS.map((_, i) => buildWeekInput(i));
}

module.exports = { CLIENT_ID, WEEK_ENDINGS, buildWeekInput, buildAllWeeks };
