'use strict';

/**
 * Construction BPO: change-order SLA tracking.
 *
 * A change order is "stalled" once it has sat open (status 'pending')
 * longer than the SLA window without a decision -- 72 hours by default,
 * the standard turnaround commitment this service's clients are held to.
 * Age is measured from submittedAt to resolvedAt (if the CO has since been
 * decided) or to `asOf` (default: now) for one still open -- a CO that was
 * decided promptly is never retroactively flagged just because `asOf` has
 * since moved on.
 *
 * Never guesses a missing date: a CO missing submittedAt, or with an
 * unparseable one, gets ageHours/isStalled left null and an
 * INVALID_SUBMITTED_AT flag instead of being silently excluded or treated
 * as age-zero.
 */

const DEFAULT_SLA_HOURS = 72;
const MS_PER_HOUR = 60 * 60 * 1000;

function parseDate(v) {
  if (v === undefined || v === null || v === '') return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * evaluateChangeOrder(co, opts?) -> {
 *   id, jobId, status, submittedAt, resolvedAt, ageHours, isOpen, isStalled, flags: [...]
 * }
 *
 * co: { id, jobId, title?, amount?, status: 'pending'|'approved'|'rejected',
 *       submittedAt, resolvedAt? }
 * opts: { asOf?: Date|string (default: now), slaHours?: number (default: 72) }
 */
function evaluateChangeOrder(co, opts = {}) {
  if (!co || typeof co !== 'object') throw new Error('change order must be an object');
  if (typeof co.id !== 'string' || !co.id.trim()) throw new Error('change order.id is required');

  const slaHours = typeof opts.slaHours === 'number' && opts.slaHours > 0 ? opts.slaHours : DEFAULT_SLA_HOURS;
  const asOf = parseDate(opts.asOf) || new Date();
  const flags = [];

  const submittedAt = parseDate(co.submittedAt);
  if (submittedAt === null) {
    const isMissing = co.submittedAt === undefined || co.submittedAt === null || co.submittedAt === '';
    flags.push({
      type: 'INVALID_SUBMITTED_AT', id: co.id, jobId: co.jobId,
      value: isMissing ? null : co.submittedAt, reason: isMissing ? 'missing' : 'unparseable',
    });
  }

  const resolvedAt = parseDate(co.resolvedAt);
  const isOpen = co.status === 'pending';
  const measuredAt = isOpen ? asOf : (resolvedAt || asOf);

  let ageHours = null;
  if (submittedAt) {
    ageHours = Math.round(((measuredAt.getTime() - submittedAt.getTime()) / MS_PER_HOUR) * 100) / 100;
  }

  const isStalled = isOpen && ageHours !== null && ageHours > slaHours;
  if (isStalled) {
    flags.push({
      type: 'SLA_BREACH', id: co.id, jobId: co.jobId,
      ageHours, slaHours, overageHours: Math.round((ageHours - slaHours) * 100) / 100,
    });
  }

  return {
    id: co.id,
    jobId: co.jobId,
    status: co.status,
    submittedAt: co.submittedAt || null,
    resolvedAt: co.resolvedAt || null,
    ageHours,
    isOpen,
    isStalled,
    flags,
  };
}

/** evaluateChangeOrders(list, opts?) -> array of evaluateChangeOrder results, one per CO */
function evaluateChangeOrders(list, opts) {
  if (!Array.isArray(list)) throw new Error('change orders must be an array');
  return list.map((co) => evaluateChangeOrder(co, opts));
}

/** summarizeStalledByJob(evaluated) -> { [jobId]: stalledCount }, jobs with zero stalled COs omitted */
function summarizeStalledByJob(evaluated) {
  const counts = {};
  for (const co of evaluated) {
    if (!co.isStalled) continue;
    counts[co.jobId] = (counts[co.jobId] || 0) + 1;
  }
  return counts;
}

module.exports = { DEFAULT_SLA_HOURS, evaluateChangeOrder, evaluateChangeOrders, summarizeStalledByJob };
