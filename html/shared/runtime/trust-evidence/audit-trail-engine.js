/**
 * audit-trail-engine.js
 *
 * Read-side query engine over the evidence ledger for compliance/audit use
 * cases (Healthcare, Insurance, FinOps, Legal). Produces exportable audit
 * views without ever mutating the underlying ledger.
 */

function queryAuditTrail(evidenceLedger, opts) {
  opts = opts || {};
  let records = opts.domain ? evidenceLedger.getByDomain(opts.domain, 100000) : evidenceLedger.all();

  if (opts.from) records = records.filter(function (r) { return new Date(r.ts) >= new Date(opts.from); });
  if (opts.to) records = records.filter(function (r) { return new Date(r.ts) <= new Date(opts.to); });
  if (opts.ruleId) records = records.filter(function (r) { return (r.ruleIds || []).indexOf(opts.ruleId) !== -1; });

  return records.sort(function (a, b) { return new Date(a.ts) - new Date(b.ts); });
}

function exportAuditTrailCSV(records) {
  const header = ['id', 'timestamp', 'domain', 'decisionId', 'summary', 'ruleIds', 'confidence', 'approvalCount', 'outcomeCount'];
  const rows = records.map(function (r) {
    return [
      r.id,
      r.ts,
      r.domain,
      r.decisionId,
      JSON.stringify(r.summary || ''),
      (r.ruleIds || []).join('|'),
      r.confidence != null ? r.confidence : '',
      (r.approvals || []).length,
      (r.outcomes || []).length,
    ];
  });
  return [header].concat(rows).map(function (row) { return row.join(','); }).join('\n');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { queryAuditTrail: queryAuditTrail, exportAuditTrailCSV: exportAuditTrailCSV };
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.auditTrail = { queryAuditTrail: queryAuditTrail, exportAuditTrailCSV: exportAuditTrailCSV };
}
