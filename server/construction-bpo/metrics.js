'use strict';

/**
 * Construction BPO: pilot/engagement metrics.
 *
 * Pure compute layer (no storage/auth) over an already-fetched list of a
 * client's weekly reports plus its controller-time entries -- routes/
 * construction-bpo.js's GET .../metrics route does the fetching, this
 * module just does the math, so it can be unit-tested without Mongo.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * phoenixWednesdayDeadline(weekEnding) -> Date
 * weekEnding: 'YYYY-MM-DD'. Returns 23:59:59.999 America/Phoenix (fixed
 * UTC-7 year-round -- Arizona does not observe DST, so this never needs a
 * DST table) of the first Wednesday strictly after weekEnding. A report
 * covering the week ending, say, Friday 2026-01-09 is "on time" if
 * published by Wednesday 2026-01-14 23:59 Phoenix time -- the standard
 * delivery commitment this service's clients are held to.
 */
function phoenixWednesdayDeadline(weekEnding) {
  const [y, m, d] = String(weekEnding).split('-').map(Number);
  if (!y || !m || !d) throw new Error('weekEnding must be YYYY-MM-DD, got ' + weekEnding);
  let day = new Date(Date.UTC(y, m - 1, d) + MS_PER_DAY); // start searching the day AFTER weekEnding
  while (day.getUTCDay() !== 3) day = new Date(day.getTime() + MS_PER_DAY); // 3 = Wednesday
  const yy = day.getUTCFullYear();
  const mm = String(day.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(day.getUTCDate()).padStart(2, '0');
  return new Date(`${yy}-${mm}-${dd}T23:59:59.999-07:00`);
}

/**
 * buildPilotMetrics({ reports, controllerTimeEntries }) -> {
 *   clientId, weeksDelivered, weeksOnTime, weeksLate,
 *   flags: { pending, approved, dismissed, total },
 *   controllerTime: { totalMinutes, entries: [...] }
 * }
 *
 * reports: array of stored weekly-report documents (any status) for one
 * client. Only 'published' reports count toward delivered/onTime/late --
 * a still-draft report hasn't been delivered to anyone yet.
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
