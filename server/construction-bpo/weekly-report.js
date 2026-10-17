'use strict';

/**
 * Construction BPO: weekly GC financial review report.
 *
 * Pure compute layer: combines per-job WIP (wip.js), change-order SLA
 * tracking (change-orders.js), retainage variance (retainage.js), and
 * lien-waiver compliance (lien-waivers.js) into one draft report for a
 * client's week. Nothing here touches storage or auth -- that's
 * routes/construction-bpo.js and server/construction-bpo/store.js. A
 * report built here always starts life as status 'draft': the review
 * gate (an analyst/manager/admin explicitly publishing it) lives in the
 * route layer, not here, so this module can be unit-tested without any
 * session/role machinery. Every flag also starts 'pending' its own
 * per-flag review (see the flags.forEach() below) -- publishing is
 * refused while any flag is still pending (store.js).
 */

const { computeWipSchedule } = require('./wip');
const { evaluateChangeOrders } = require('./change-orders');
const { computeRetainageSchedule } = require('./retainage');
const { evaluateLienWaivers } = require('./lien-waivers');

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * buildWeeklyReportDraft(input, thresholds?) -> {
 *   clientId, weekEnding, generatedAt, status: 'draft',
 *   jobs, changeOrders, retainage, lienWaivers,
 *   flags: [...], flagCounts: { [type]: count }, summary: {...}
 * }
 *
 * input: {
 *   clientId, weekEnding (YYYY-MM-DD), asOf?,
 *   jobs: [...wip.js job inputs...],
 *   changeOrders: [...change-orders.js CO inputs...],
 *   retainage: [...retainage.js job inputs...],
 *   lienWaivers: [...lien-waivers.js entry inputs...],
 * }
 * thresholds: { wip?, slaHours?, retainage? } -- passed through to each engine.
 */
function buildWeeklyReportDraft(input, thresholds = {}) {
  if (!input || typeof input !== 'object') throw new Error('input must be an object');
  if (typeof input.clientId !== 'string' || !input.clientId.trim()) throw new Error('input.clientId is required');
  if (typeof input.weekEnding !== 'string' || !input.weekEnding.trim()) throw new Error('input.weekEnding is required');

  const asOf = input.asOf || new Date().toISOString();
  const jobs = computeWipSchedule(input.jobs || [], thresholds.wip);
  const changeOrders = evaluateChangeOrders(input.changeOrders || [], { asOf, slaHours: thresholds.slaHours });
  const retainage = computeRetainageSchedule(input.retainage || [], thresholds.retainage);
  const lienWaivers = evaluateLienWaivers(input.lienWaivers || [], { asOf });

  const flags = [
    ...jobs.flatMap((j) => j.flags),
    ...changeOrders.flatMap((c) => c.flags),
    ...retainage.flatMap((r) => r.flags),
    ...lienWaivers.flatMap((w) => w.flags),
  ];
  // Per-flag review gate (routes/construction-bpo.js's PATCH .../flags/:flagId):
  // every flag starts 'pending' and must be explicitly approved or dismissed
  // by an analyst before the report can be published. flagId is assigned
  // here, once, as a stable per-draft index -- these flag objects are still
  // the SAME references embedded in jobs[].flags/changeOrders[].flags/etc at
  // this point (pre-storage), so mutating them here also stamps the nested
  // copies; after a Mongo round-trip that shared identity is gone, which is
  // why store.js's updateFlagStatus() has to walk all five locations by
  // flagId rather than relying on object identity.
  flags.forEach((f, i) => {
    f.flagId = 'F' + (i + 1);
    f.status = 'pending';
    f.note = null;
    f.reviewedBy = null;
    f.reviewedAt = null;
  });
  const flagCounts = {};
  for (const f of flags) flagCounts[f.type] = (flagCounts[f.type] || 0) + 1;

  const sumField = (arr, field) => {
    const withValue = arr.filter((j) => j[field] !== null);
    return withValue.length ? round2(withValue.reduce((s, j) => s + j[field], 0)) : null;
  };
  const summary = {
    jobCount: jobs.length,
    jobsWithFlags: new Set(flags.map((f) => f.jobId).filter(Boolean)).size,
    totalEarnedRevenue: sumField(jobs, 'earnedRevenue'),
    totalOverUnderBilling: sumField(jobs, 'overUnderBilling'),
    stalledChangeOrders: changeOrders.filter((c) => c.isStalled).length,
    retainageVariances: retainage.filter((r) => r.flags.some((f) => f.type === 'RETAINAGE_VARIANCE')).length,
    lienWaiverIssues: lienWaivers.filter((w) => w.status !== 'ok').length,
  };

  return {
    clientId: input.clientId,
    weekEnding: input.weekEnding,
    generatedAt: new Date().toISOString(),
    status: 'draft',
    jobs,
    changeOrders,
    retainage,
    lienWaivers,
    flags,
    flagCounts,
    summary,
  };
}

module.exports = { buildWeeklyReportDraft };
