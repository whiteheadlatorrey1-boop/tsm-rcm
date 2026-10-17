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
 * COST_OVERRUN cannot be checked against cost-to-cost % complete
 * (costsToDate / totalEstimatedCost) -- that ratio is the SAME number the
 * cost-overrun trigger's own "costs > 90% of estimate" side already uses,
 * so "percentComplete < 85%" would just restate "costPct > 90%" and could
 * never both be true (fixed after an earlier version of this file shipped
 * with exactly that dead condition). The progress side of this flag needs
 * an independent signal: physicalPercentComplete, a PM-reported field
 * carried on the job input (set by the import pipeline from a dedicated
 * column, never computed from cost). If it's missing, this trigger simply
 * cannot fire -- physicalProgressStatus on the result says 'not_provided'
 * rather than this module inferring a stand-in value.
 *
 * Never guesses a missing number: a job missing costsToDate, contractValue,
 * or (critically) totalEstimatedCost gets INCOMPLETE_DATA and every derived
 * field that would depend on the missing input stays null, not a fabricated
 * default.
 */

const DEFAULT_THRESHOLDS = {
  // COST_OVERRUN trigger A ("progress-based"): costs have eaten most of the
  // estimate while PM-reported PHYSICAL completion lags badly behind -- the
  // two conditions together (not either alone) are what signal "this job
  // is going to blow its budget", not just "this job has spent a lot"
  // (large jobs spend a lot early on mobilization/materials without that
  // implying trouble). Requires physicalPercentComplete on the job input;
  // never evaluated off a cost-derived percentage.
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
 *   overUnderBilling, projectedProfit, projectedMarginPct,
 *   physicalPercentComplete, physicalProgressStatus, flags: [...]
 * }
 *
 * job: {
 *   jobId, costsToDate, totalEstimatedCost, contractValue, billedToDate,
 *   originalBudget?, physicalPercentComplete?
 * }
 * costsToDate/totalEstimatedCost/contractValue/billedToDate missing simply
 * leave the fields that depend on them null and add INCOMPLETE_DATA, rather
 * than throwing or guessing.
 *
 * originalBudget and physicalPercentComplete are optional PM-reported
 * fields used only by COST_OVERRUN's two triggers (see module header) --
 * their absence never produces INCOMPLETE_DATA on its own, since every
 * other calculation here works without them.
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
  const originalBudget = isPositiveFiniteNumber(job.originalBudget) && job.originalBudget > 0 ? job.originalBudget : null;
  const physicalPercentComplete = (typeof job.physicalPercentComplete === 'number' && Number.isFinite(job.physicalPercentComplete) &&
    job.physicalPercentComplete >= 0 && job.physicalPercentComplete <= 100) ? job.physicalPercentComplete : null;
  // Reported, never inferred: distinguishes "PM said 0%" (a real, if
  // alarming, data point) from "nobody gave us a number for this job."
  const physicalProgressStatus = physicalPercentComplete !== null ? 'provided' : 'not_provided';

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

  // COST_OVERRUN trigger A ("progress-based"): costs > 90% of estimate
  // while PM-reported PHYSICAL completion is < 85%. Independent of
  // percentComplete (cost-to-cost) on purpose -- see module header.
  // Requires physicalPercentComplete; if it's missing, this trigger simply
  // does not fire (physicalProgressStatus on the result says so).
  if (
    costsToDate !== null && totalEstimatedCost !== null && physicalPercentComplete !== null &&
    costsToDate / totalEstimatedCost > t.costOverrunCostPct &&
    physicalPercentComplete / 100 < t.costOverrunCompletePct
  ) {
    flags.push({
      type: 'COST_OVERRUN', jobId: job.jobId, reason: 'cost_vs_physical_progress',
      costsToDate, totalEstimatedCost, costPct: round2((costsToDate / totalEstimatedCost) * 100), physicalPercentComplete,
      threshold: { costOverrunCostPct: t.costOverrunCostPct, costOverrunCompletePct: t.costOverrunCompletePct },
    });
  }

  // COST_OVERRUN trigger B ("revised EAC exceeds original budget"):
  // independent of physical progress entirely -- a revised cost estimate
  // that has already grown past the original budget is its own signal,
  // whatever percent-complete says.
  if (originalBudget !== null && totalEstimatedCost !== null && totalEstimatedCost > originalBudget) {
    flags.push({
      type: 'COST_OVERRUN', jobId: job.jobId, reason: 'eac_exceeds_original_budget',
      estimateAtCompletion: totalEstimatedCost, originalBudget,
      overageAmount: round2(totalEstimatedCost - originalBudget),
      overagePct: round2(((totalEstimatedCost - originalBudget) / originalBudget) * 100),
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
    physicalPercentComplete,
    physicalProgressStatus,
    flags,
  };
}

/** computeWipSchedule(jobs, thresholds?) -> array of computeJobWip results, one per job */
function computeWipSchedule(jobs, thresholds) {
  if (!Array.isArray(jobs)) throw new Error('jobs must be an array');
  return jobs.map((job) => computeJobWip(job, thresholds));
}

module.exports = { computeJobWip, computeWipSchedule, DEFAULT_THRESHOLDS };
