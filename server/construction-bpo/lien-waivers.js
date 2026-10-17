'use strict';

/**
 * Construction BPO: lien waiver compliance.
 *
 * Every pay application to a subcontractor is expected to come back with
 * a signed waiver (conditional or unconditional) for the amount paid.
 * Three distinct ways that can fail, each its own flag type rather than a
 * single generic "waiver problem" -- the remediation is different for each:
 *   MISSING : no waiver on file at all for this pay period.
 *   SHORT   : a waiver is on file but its amount is less than what was
 *             actually paid -- the shortfall is itself lien exposure on
 *             the uncovered difference.
 *   EXPIRED : a waiver is on file and for the right amount, but its
 *             expiration date (common on conditional waivers tied to
 *             check-clearing) has passed as of `asOf`.
 * A single entry can be flagged MISSING or (SHORT and/or EXPIRED) -- never
 * both MISSING and SHORT/EXPIRED, since a short/expired check presumes a
 * waiver exists to examine.
 *
 * Never guesses: expectedAmount missing/invalid means the SHORT check
 * cannot run (not "assume covered"), and gets INCOMPLETE_DATA instead.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDate(v) {
  if (v === undefined || v === null || v === '') return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * evaluateLienWaiver(entry, opts?) -> {
 *   jobId, subcontractor, payPeriod, expectedAmount, status, amountShort,
 *   expiresAt, flags: [...]
 * }
 *
 * entry: {
 *   jobId, subcontractor, payPeriod, expectedAmount,
 *   waiver: { receivedAmount, expirationDate? } | null
 * }
 * opts: { asOf?: Date|string (default: now) }
 * status: 'ok' | 'missing' | 'short' | 'expired' | 'short_and_expired' | 'unverified'
 *   ('unverified' when expectedAmount is missing/invalid, so SHORT can't be judged)
 */
function evaluateLienWaiver(entry, opts = {}) {
  if (!entry || typeof entry !== 'object') throw new Error('entry must be an object');
  if (typeof entry.jobId !== 'string' || !entry.jobId.trim()) throw new Error('entry.jobId is required');

  const asOf = parseDate(opts.asOf) || new Date();
  const flags = [];
  const expectedAmount = isFiniteNumber(entry.expectedAmount) && entry.expectedAmount >= 0 ? entry.expectedAmount : null;
  // Flagged here (not folded into the MISSING/SHORT/EXPIRED set below) so
  // the "missing is never combined with other flags" rule stays about the
  // waiver itself, not about whether we had an expectation to check it
  // against -- a waiver-present entry with no expectedAmount still gets
  // this, on top of whatever SHORT/EXPIRED can still be judged without it.
  if (expectedAmount === null) {
    flags.push({ type: 'INCOMPLETE_DATA', jobId: entry.jobId, subcontractor: entry.subcontractor, missingFields: ['expectedAmount'] });
  }

  if (!entry.waiver) {
    flags.push({ type: 'LIEN_WAIVER_MISSING', jobId: entry.jobId, subcontractor: entry.subcontractor, payPeriod: entry.payPeriod, expectedAmount });
    return { jobId: entry.jobId, subcontractor: entry.subcontractor, payPeriod: entry.payPeriod, expectedAmount, status: 'missing', amountShort: null, expiresAt: null, flags };
  }

  const receivedAmount = isFiniteNumber(entry.waiver.receivedAmount) ? entry.waiver.receivedAmount : null;
  const expiresAt = parseDate(entry.waiver.expirationDate);

  let isShort = false;
  let amountShort = null;
  if (expectedAmount !== null && receivedAmount !== null && receivedAmount < expectedAmount) {
    isShort = true;
    amountShort = Math.round((expectedAmount - receivedAmount) * 100) / 100;
    flags.push({ type: 'LIEN_WAIVER_SHORT', jobId: entry.jobId, subcontractor: entry.subcontractor, payPeriod: entry.payPeriod, expectedAmount, receivedAmount, amountShort });
  }

  const isExpired = expiresAt !== null && expiresAt.getTime() < asOf.getTime();
  if (isExpired) {
    flags.push({
      type: 'LIEN_WAIVER_EXPIRED', jobId: entry.jobId, subcontractor: entry.subcontractor, payPeriod: entry.payPeriod,
      expirationDate: entry.waiver.expirationDate, daysExpired: Math.ceil((asOf.getTime() - expiresAt.getTime()) / MS_PER_DAY),
    });
  }

  let status;
  if (isShort && isExpired) status = 'short_and_expired';
  else if (isShort) status = 'short';
  else if (isExpired) status = 'expired';
  else if (expectedAmount === null) status = 'unverified';
  else status = 'ok';

  return { jobId: entry.jobId, subcontractor: entry.subcontractor, payPeriod: entry.payPeriod, expectedAmount, status, amountShort, expiresAt: entry.waiver.expirationDate || null, flags };
}

/** evaluateLienWaivers(list, opts?) -> array of evaluateLienWaiver results, one per entry */
function evaluateLienWaivers(list, opts) {
  if (!Array.isArray(list)) throw new Error('entries must be an array');
  return list.map((entry) => evaluateLienWaiver(entry, opts));
}

module.exports = { evaluateLienWaiver, evaluateLienWaivers };
