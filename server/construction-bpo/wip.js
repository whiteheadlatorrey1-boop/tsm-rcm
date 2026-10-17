'use strict';

/**
 * Construction BPO: per-job WIP (work-in-progress) calculations.
 *
 * Replaces use of wip-engine.js's calculateConstruction() (3 lines, no
 * flags, no thresholds) for this service only -- that file is untouched
 * and still backs the unrelated Construction war-room demo vertical.
 *
 * Sign convention for overUnderBilling (billedToDate - earnedRevenue):
 *   positive -> OVERBILLED  (billed more than earned: a liability, "billed in
 *               excess of costs and estimated earnings")
 *   negative -> UNDERBILLED (earned more than billed: an asset, "costs and
 *               estimated earnings in excess of billings")
 * This matches standard percentage-of-completion accounting terminology.
 *
 * Never guesses a missing number: a job missing costsToDate, contractValue,
 * or (critically) totalEstimatedCost gets INCOMPLETE_DATA and every derived
 * field that would depend on the missing input stays null, not a fabricated
 * default.
 */

const DEFAULT_THRESHOLDS = {
  // COST_OVERRUN: costs have eaten most of the estimate while physical
  // completion lags badly behind -- the two conditions together (not
  // either alone) are what signal "this job is going to blow its budget",
  // not just "this job has spent a lot" (large jobs spend a lot early on
  // mobilization/materials without that implying trouble).
  costOverrunCostPct: 0.90,
  costOverrunCompletePct: 0.85,
  // OVERBILLED / UNDERBILLED: the billing/earned-revenue gap as a fraction
  // of total contract value.
  billingVariancePct: 0.10,
  // LOW_MARGIN: projected margin (assuming the estimate holds) below this
  // fraction of contract value.
  lowMarginPct: 0.05,
};

function round2(n) {
  return Math.round(n * 100) / 100;
}

function isPositiveFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

/**
 * computeJobWip(job, thresholds?) -> {
 *   jobId, percentComplete, earnedRevenue, billedToDate, costToComplete,
 *   overUnderBilling, projectedProfit, projectedMarginPct, flags: [...]
 * }
 *
 * job: { jobId, costsToDate, totalEstimatedCost, contractValue, billedToDate }
 * All four numeric fields are optional -- missing ones simply leave the
 * fields that depend on them null and add INCOMPLETE_DATA, rather than
 * throwing or guessing.
 */
function computeJobWip(job, thresholds) {
  if (!job || typeof job !== 'object') throw new Error('job must be an object');
  if (typeof job.jobId !== 'string' || !job.jobId.trim()) throw new Error('job.jobId is required');

  const t = { ...DEFAULT_THRESHOLDS, ...(thresholds || {}) };
  const flags = [];

  const costsToDate = isPositiveFiniteNumber(job.costsToDate) ? job.costsToDate : null;
  const totalEstimatedCost = isPositiveFiniteNumber(job.totalEstimatedCost) && job.totalEstimatedCost > 0 ? job.totalEstimatedCost : null;
  const contractValue = isPositiveFiniteNumber(job.contractValue) && job.contractValue > 0 ? job.contractValue : null;
  const billedToDate = isPositiveFiniteNumber(job.billedToDate) ? job.billedToDate : null;

  const missing = [];
  if (job.costsToDate === undefined || job.costsToDate === null || costsToDate === null) missing.push('costsToDate');
  if (job.totalEstimatedCost === undefined || job.totalEstimatedCost === null || totalEstimatedCost === null) missing.push('totalEstimatedCost');
  if (job.contractValue === undefined || job.contractValue === null || contractValue === null) missing.push('contractValue');
  if (job.billedToDate === undefined || job.billedToDate === null || billedToDate === null) missing.push('billedToDate');

  let percentComplete = null;
  let costToComplete = null;
  if (costsToDate !== null && totalEstimatedCost !== null) {
    percentComplete = round2((costsToDate / totalEstimatedCost) * 100);
    costToComplete = round2(Math.max(totalEstimatedCost - costsToDate, 0));
  }

  let earnedRevenue = null;
  if (percentComplete !== null && contractValue !== null) {
    earnedRevenue = round2((percentComplete / 100) * contractValue);
  }

  let overUnderBilling = null;
  if (earnedRevenue !== null && billedToDate !== null) {
    overUnderBilling = round2(billedToDate - earnedRevenue);
  }

  let projectedProfit = null;
  let projectedMarginPct = null;
  if (contractValue !== null && totalEstimatedCost !== null) {
    projectedProfit = round2(contractValue - totalEstimatedCost);
    projectedMarginPct = round2((projectedProfit / contractValue) * 100);
  }

  // INCOMPLETE_DATA: listed (a jobId exists) but never given an estimate --
  // the one field everything else here hinges on.
  if (totalEstimatedCost === null) {
    flags.push({ type: 'INCOMPLETE_DATA', jobId: job.jobId, missingFields: missing });
  }

  if (
    costsToDate !== null && totalEstimatedCost !== null && percentComplete !== null &&
    costsToDate / totalEstimatedCost > t.costOverrunCostPct &&
    percentComplete / 100 < t.costOverrunCompletePct
  ) {
    flags.push({
      type: 'COST_OVERRUN', jobId: job.jobId,
      costsToDate, totalEstimatedCost, costPct: round2((costsToDate / totalEstimatedCost) * 100), percentComplete,
      threshold: { costOverrunCostPct: t.costOverrunCostPct, costOverrunCompletePct: t.costOverrunCompletePct },
    });
  }

  if (overUnderBilling !== null && contractValue !== null) {
    const variancePct = Math.abs(overUnderBilling) / contractValue;
    if (variancePct > t.billingVariancePct) {
      flags.push({
        type: overUnderBilling > 0 ? 'OVERBILLED' : 'UNDERBILLED', jobId: job.jobId,
        overUnderBilling, contractValue, variancePct: round2(variancePct * 100),
        threshold: { billingVariancePct: t.billingVariancePct },
      });
    }
  }

  if (projectedMarginPct !== null && projectedMarginPct / 100 < t.lowMarginPct) {
    flags.push({
      type: 'LOW_MARGIN', jobId: job.jobId,
      projectedProfit, projectedMarginPct, contractValue,
      threshold: { lowMarginPct: t.lowMarginPct },
    });
  }

  return {
    jobId: job.jobId,
    percentComplete,
    earnedRevenue,
    billedToDate,
    costToComplete,
    overUnderBilling,
    projectedProfit,
    projectedMarginPct,
    flags,
  };
}

/** computeWipSchedule(jobs, thresholds?) -> array of computeJobWip results, one per job */
function computeWipSchedule(jobs, thresholds) {
  if (!Array.isArray(jobs)) throw new Error('jobs must be an array');
  return jobs.map((job) => computeJobWip(job, thresholds));
}

module.exports = { computeJobWip, computeWipSchedule, DEFAULT_THRESHOLDS };
