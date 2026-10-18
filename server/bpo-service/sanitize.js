'use strict';

/**
 * Generic client-view sanitizing for a BPO-service weekly report: a
 * client must never see a flag an analyst hasn't approved, or any
 * analyst note (approved or not) -- matches the rule
 * server/construction-bpo's routes enforce, generalized to any
 * plug-in's report shape via `reportSections` (the array of top-level
 * keys on the report that hold arrays of entities each carrying its own
 * `.flags`, e.g. ['jobs','changeOrders','retainage','lienWaivers'] for
 * construction-bpo).
 */

function sanitizeFlagsForClient(flags) {
  return (flags || [])
    .filter((f) => f.status === 'approved')
    .map((f) => { const { note, ...rest } = f; return rest; });
}

/** Deep-clones a report and strips every flag array (top-level + each reportSections entity) to approved-only, notes removed. */
function sanitizeReportForClient(report, reportSections) {
  const clone = JSON.parse(JSON.stringify(report));
  clone.flags = sanitizeFlagsForClient(clone.flags);
  for (const key of reportSections || []) {
    if (Array.isArray(clone[key])) {
      for (const entity of clone[key]) entity.flags = sanitizeFlagsForClient(entity.flags);
    }
  }
  return clone;
}

module.exports = { sanitizeFlagsForClient, sanitizeReportForClient };
