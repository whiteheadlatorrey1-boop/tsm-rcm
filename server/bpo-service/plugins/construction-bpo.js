'use strict';

/**
 * Construction BPO as a bpo-service plug-in -- reuses the EXISTING,
 * untouched engines (server/construction-bpo/wip.js, change-orders.js,
 * retainage.js, lien-waivers.js) verbatim, the same way
 * server/construction-bpo/weekly-report.js combines them, so flag
 * computation is byte-for-byte the same logic as the original
 * /api/construction-bpo/* routes -- this plug-in is a second entry
 * point onto those same engines (via /api/bpo-service/construction-bpo/
 * ...), not a reimplementation of them.
 *
 * fileTypes/columnAliases mirror server/construction-bpo/import.js's
 * CANONICAL_FIELDS/SOURCE_ALIASES (reused directly, not copied) --
 * scripts/test-bpo-service-import-engine-equivalence.js proves the
 * generic import-engine.js, given this spec, produces identical output
 * to the original import.js for the same input.
 */

const { computeWipSchedule } = require('../../construction-bpo/wip');
const { evaluateChangeOrders } = require('../../construction-bpo/change-orders');
const { computeRetainageSchedule } = require('../../construction-bpo/retainage');
const { evaluateLienWaivers } = require('../../construction-bpo/lien-waivers');
const importer = require('../../construction-bpo/import');

function round2(n) {
  return Math.round(n * 100) / 100;
}

function computeFlags(input, thresholds = {}) {
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

  const sumField = (arr, field) => {
    const withValue = arr.filter((j) => j[field] !== null);
    return withValue.length ? round2(withValue.reduce((s, j) => s + j[field], 0)) : null;
  };

  const summary = [
    { key: 'jobCount', label: 'Jobs', value: jobs.length },
    { key: 'jobsWithFlags', label: 'Jobs w/ Flags', value: new Set(flags.map((f) => f.jobId).filter(Boolean)).size },
    { key: 'totalEarnedRevenue', label: 'Earned Revenue', value: sumField(jobs, 'earnedRevenue') },
    { key: 'totalOverUnderBilling', label: 'Over/Under Billing', value: sumField(jobs, 'overUnderBilling') },
    { key: 'stalledChangeOrders', label: 'Stalled Change Orders', value: changeOrders.filter((c) => c.isStalled).length },
    { key: 'retainageVariances', label: 'Retainage Variances', value: retainage.filter((r) => r.flags.some((f) => f.type === 'RETAINAGE_VARIANCE')).length },
    { key: 'lienWaiverIssues', label: 'Lien Waiver Issues', value: lienWaivers.filter((w) => w.status !== 'ok').length },
  ];

  return { sections: { jobs, changeOrders, retainage, lienWaivers }, flags, summary };
}

// Same numeric/string field split as server/construction-bpo/import.js's
// NUMERIC_FIELDS (not exported there, so mirrored here rather than
// touching that file to export it).
const NUMERIC_FIELDS = ['costsToDate', 'totalEstimatedCost', 'contractValue', 'billedToDate', 'originalBudget', 'physicalPercentComplete'];

const FILE_TYPES = [
  {
    key: 'jobs',
    canonicalFields: importer.CANONICAL_FIELDS,
    numericFields: NUMERIC_FIELDS,
    stringFields: ['jobName'],
    requiredField: 'jobId',
    sourceAliases: importer.SOURCE_ALIASES,
  },
];

module.exports = {
  id: 'construction-bpo',
  fileTypes: FILE_TYPES,
  reportSections: ['jobs', 'changeOrders', 'retainage', 'lienWaivers'],
  computeFlags,
};
