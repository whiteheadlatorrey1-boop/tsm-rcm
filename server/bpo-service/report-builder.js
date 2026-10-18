'use strict';

/**
 * Generic weekly-report combiner, generalized from
 * server/construction-bpo/weekly-report.js: calls the plug-in's
 * computeFlags(input, thresholds), then does the vertical-agnostic
 * bookkeeping every plug-in needs identically -- assigning each flag a
 * stable flagId + status 'pending' (the per-flag review gate), tallying
 * flagCounts, and assembling the final draft document (always starts
 * life as status 'draft'; the review gate lives in routes.js, not here,
 * so this stays unit-testable without any session/role machinery).
 */

function buildReportDraft(plugin, input, thresholds = {}) {
  if (!plugin || typeof plugin.computeFlags !== 'function') throw new Error('plugin.computeFlags must be a function');
  if (!input || typeof input !== 'object') throw new Error('input must be an object');
  if (typeof input.clientId !== 'string' || !input.clientId.trim()) throw new Error('input.clientId is required');
  if (typeof input.weekEnding !== 'string' || !input.weekEnding.trim()) throw new Error('input.weekEnding is required');

  const { sections, flags, summary } = plugin.computeFlags(input, thresholds);

  // Per-flag review gate (routes.js's PATCH .../flags/:flagId): every
  // flag starts 'pending' and must be explicitly approved/dismissed
  // before the report can publish. flagId is a stable per-draft index --
  // these flag objects are still the SAME references embedded in each
  // sections[key][i].flags array at this point (pre-storage), so
  // mutating them here also stamps the nested copies; after a Mongo
  // round-trip that shared identity is gone (store.js's
  // updateFlagStatus() walks every section by flagId for that reason).
  flags.forEach((f, i) => {
    f.flagId = 'F' + (i + 1);
    f.status = 'pending';
    f.note = null;
    f.reviewedBy = null;
    f.reviewedAt = null;
  });
  const flagCounts = {};
  for (const f of flags) flagCounts[f.type] = (flagCounts[f.type] || 0) + 1;

  return Object.assign(
    {
      clientId: input.clientId,
      weekEnding: input.weekEnding,
      generatedAt: new Date().toISOString(),
      status: 'draft',
      reportSections: plugin.reportSections,
    },
    sections,
    { flags, flagCounts, summary }
  );
}

module.exports = { buildReportDraft };
