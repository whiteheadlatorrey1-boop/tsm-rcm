'use strict';

/**
 * Generic BPO-service pilot/engagement metrics -- vertical-agnostic, no
 * plug-in knowledge needed at all.
 *
 * This is an intentional duplicate of server/construction-bpo/metrics.js
 * (which is itself already 100% generic -- it never referenced anything
 * construction-specific). Kept as two separate files rather than one
 * shared module so server/construction-bpo/* stays completely untouched
 * (zero behavior-change risk to the existing /api/construction-bpo/*
 * routes and their tests) while server/bpo-service/* is self-contained
 * and doesn't reach back into a single vertical's directory for a piece
 * every vertical needs. scripts/test-bpo-service-metrics.js checks this
 * copy directly; it is expected to stay logically identical to the
 * construction-bpo original -- if you change the deadline rule or the
 * aggregation here, consider whether construction-bpo's copy needs the
 * same change (its own callers/tests are unaffected either way, since
 * that route surface still uses its own copy).
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * phoenixWednesdayDeadline(weekEnding) -> Date
 * weekEnding: 'YYYY-MM-DD'. Returns 23:59:59.999 America/Phoenix (fixed
 * UTC-7 year-round -- Arizona does not observe DST) of the first
 * Wednesday strictly after weekEnding. A weekEnding that is itself a
 * Wednesday still resolves to the NEXT Wednesday, never same-day.
 */
function phoenixWednesdayDeadline(weekEnding) {
  const [y, m, d] = String(weekEnding).split('-').map(Number);
  if (!y || !m || !d) throw new Error('weekEnding must be YYYY-MM-DD, got ' + weekEnding);
  let day = new Date(Date.UTC(y, m - 1, d) + MS_PER_DAY);
  while (day.getUTCDay() !== 3) day = new Date(day.getTime() + MS_PER_DAY); // 3 = Wednesday
  const yy = day.getUTCFullYear();
  const mm = String(day.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(day.getUTCDate()).padStart(2, '0');
  return new Date(`${yy}-${mm}-${dd}T23:59:59.999-07:00`);
}

/**
 * buildPilotMetrics({ clientId, reports, controllerTimeEntries }) -> {
 *   clientId, weeksDelivered, weeksOnTime, weeksLate,
 *   flags: { pending, approved, dismissed, total },
 *   controllerTime: { totalMinutes, entries: [...] }
 * }
 * Only 'published' reports count toward delivered/onTime/late.
 */
function buildPilotMetrics({ clientId, reports, controllerTimeEntries }) {
  const published = (reports || []).filter((r) => r.status === 'published' && r.publishedAt);
  let weeksOnTime = 0;
  let weeksLate = 0;
  for (const r of published) {
    const deadline = phoenixWednesdayDeadline(r.weekEnding);
    const publishedAt = new Date(r.publishedAt);
    if (publishedAt.getTime() <= deadline.getTime()) weeksOnTime++;
    else weeksLate++;
  }

  const flagCounts = { pending: 0, approved: 0, dismissed: 0, total: 0 };
  for (const r of reports || []) {
    for (const f of r.flags || []) {
      flagCounts.total++;
      if (f.status === 'approved') flagCounts.approved++;
      else if (f.status === 'dismissed') flagCounts.dismissed++;
      else flagCounts.pending++;
    }
  }

  const entries = (controllerTimeEntries || []).map((e) => ({ week: e.week, minutes: e.minutes, recordedBy: e.recordedBy, recordedAt: e.recordedAt }));
  const totalMinutes = entries.reduce((sum, e) => sum + (typeof e.minutes === 'number' ? e.minutes : 0), 0);

  return {
    clientId,
    weeksDelivered: published.length,
    weeksOnTime,
    weeksLate,
    flags: flagCounts,
    controllerTime: { totalMinutes, entries },
  };
}

module.exports = { phoenixWednesdayDeadline, buildPilotMetrics };
