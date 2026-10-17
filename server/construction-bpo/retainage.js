'use strict';

/**
 * Construction BPO: per-job retainage tracking.
 *
 * Retainage is the percentage of each billing withheld by the owner until
 * substantial completion/closeout. Expected retainage held is simply
 * billedToDate * retainagePct; variance is what's ACTUALLY held
 * (retainageHeld, as reported by the GC's accounting system -- it can
 * diverge from the simple formula for real reasons: retainage reduced
 * after 50% complete per the contract, a prior release, a data-entry
 * error) minus that expectation. A variance flag means "this job's
 * retainage doesn't match what the contract rate alone would predict and
 * needs an analyst to say why," not "this is necessarily wrong."
 *
 * Variance is judged as a fraction of billedToDate (not of the variance
 * dollar amount itself, which would be circular) -- a $500 miss on a $2M
 * billed job is noise; the same $500 miss on a $5,000 billed job is not.
 *
 * Never guesses a missing number: a job missing billedToDate, retainagePct,
 * or retainageHeld gets its dependent fields left null and an
 * INCOMPLETE_DATA flag, same convention as wip.js.
 */

const DEFAULT_THRESHOLDS = {
  // Fraction of billedToDate that retainageHeld may diverge from the
  // contract-rate expectation before this flags for review.
  retainageVariancePct: 0.02,
};

function round2(n) {
  return Math.round(n * 100) / 100;
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * computeJobRetainage(job, thresholds?) -> {
 *   jobId, billedToDate, retainagePct, retainageHeld, expectedRetainage,
 *   variance, variancePctOfBilled, flags: [...]
 * }
 *
 * job: { jobId, billedToDate, retainagePct, retainageHeld }
 * retainagePct is a fraction (0.10 for 10%), not a 0-100 percentage.
 */
function computeJobRetainage(job, thresholds) {
  if (!job || typeof job !== 'object') throw new Error('job must be an object');
  if (typeof job.jobId !== 'string' || !job.jobId.trim()) throw new Error('job.jobId is required');

  const t = { ...DEFAULT_THRESHOLDS, ...(thresholds || {}) };
  const flags = [];

  const billedToDate = isFiniteNumber(job.billedToDate) && job.billedToDate >= 0 ? job.billedToDate : null;
  const retainagePct = isFiniteNumber(job.retainagePct) && job.retainagePct >= 0 && job.retainagePct <= 1 ? job.retainagePct : null;
  const retainageHeld = isFiniteNumber(job.retainageHeld) && job.retainageHeld >= 0 ? job.retainageHeld : null;

  const missing = [];
  if (job.billedToDate === undefined || job.billedToDate === null || billedToDate === null) missing.push('billedToDate');
  if (job.retainagePct === undefined || job.retainagePct === null || retainagePct === null) missing.push('retainagePct');
  if (job.retainageHeld === undefined || job.retainageHeld === null || retainageHeld === null) missing.push('retainageHeld');
  if (missing.length) {
    flags.push({ type: 'INCOMPLETE_DATA', jobId: job.jobId, missingFields: missing });
  }

  let expectedRetainage = null;
  if (billedToDate !== null && retainagePct !== null) {
    expectedRetainage = round2(billedToDate * retainagePct);
  }

  let variance = null;
  let variancePctOfBilled = null;
  if (expectedRetainage !== null && retainageHeld !== null) {
    variance = round2(retainageHeld - expectedRetainage);
    variancePctOfBilled = billedToDate > 0 ? round2((Math.abs(variance) / billedToDate) * 100) : (variance === 0 ? 0 : null);
  }

  if (variancePctOfBilled !== null && variancePctOfBilled / 100 > t.retainageVariancePct) {
    flags.push({
      type: 'RETAINAGE_VARIANCE', jobId: job.jobId,
      expectedRetainage, retainageHeld, variance, variancePctOfBilled,
      threshold: { retainageVariancePct: t.retainageVariancePct },
    });
  }

  return { jobId: job.jobId, billedToDate, retainagePct, retainageHeld, expectedRetainage, variance, variancePctOfBilled, flags };
}

/** computeRetainageSchedule(jobs, thresholds?) -> array of computeJobRetainage results, one per job */
function computeRetainageSchedule(jobs, thresholds) {
  if (!Array.isArray(jobs)) throw new Error('jobs must be an array');
  return jobs.map((job) => computeJobRetainage(job, thresholds));
}

module.exports = { DEFAULT_THRESHOLDS, computeJobRetainage, computeRetainageSchedule };
