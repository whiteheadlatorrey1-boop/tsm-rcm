// ── Shared stage/SLA breach detection engine ───────────────────────────────
// Reusable across CRM, CPQ, O2C, and Approval — they all share the same
// underlying shape: a record sits in a named stage, that stage has an SLA in
// hours, and the record has been in that stage for some number of hours.
// This module scores how overdue each record is and turns it into a
// recommendation object, the same way MDM's decision engine turns duplicate
// pairs into merge recommendations.
//
// Records report their time-in-stage one of two ways (config picks which):
//   - a precomputed `entered_stage_at_hours_ago` numeric field (CRM, O2C), or
//   - an ISO-8601 timestamp field like `stage_entered_at` / `submitted_at`
//     (CPQ, Approval) that this engine diffs against "now" itself.

function hoursInStage(record, cfg) {
  if (cfg.hoursAgoField && typeof record[cfg.hoursAgoField] === 'number') {
    return record[cfg.hoursAgoField];
  }
  if (cfg.timestampField && record[cfg.timestampField]) {
    const entered = new Date(record[cfg.timestampField]).getTime();
    if (!Number.isNaN(entered)) {
      return Math.max(0, (Date.now() - entered) / (1000 * 60 * 60));
    }
  }
  return null;
}

function severityFor(hoursOverdue, slaHours) {
  const ratio = slaHours > 0 ? hoursOverdue / slaHours : 1;
  if (ratio >= 1) return 'critical';   // 2x+ SLA
  if (ratio >= 0.5) return 'high';     // 1.5x+ SLA
  return 'medium';                     // past SLA, under 1.5x
}

/**
 * @param {Array<object>} records
 * @param {object} cfg
 * @param {string} cfg.entity          label used in the recommendation (e.g. 'lead', 'quote')
 * @param {string} cfg.idField         field holding the record's unique id
 * @param {string} cfg.stageField      field holding the current stage id/label
 * @param {string} [cfg.ownerField]    field holding the owner/assignee, if any
 * @param {string} [cfg.valueField]    field holding a dollar value, if any
 * @param {string} [cfg.hoursAgoField] numeric hours-in-stage field
 * @param {string} [cfg.timestampField] ISO timestamp field to diff against now
 * @param {(record:object)=>(number|null)} cfg.slaHoursForRecord
 *        resolves the SLA (in hours) that applies to this record's current stage.
 *        Return null/undefined for stages with no SLA (e.g. terminal stages).
 * @param {(record:object, hoursOverdue:number)=>string} [cfg.actionForRecord]
 *        optional custom "next action" text; falls back to a generic message.
 */
function detectStageBreaches(records, cfg) {
  const recs = [];
  for (const record of records || []) {
    const slaHours = cfg.slaHoursForRecord(record);
    if (slaHours == null) continue; // stage has no SLA (terminal/closed states)

    const inStage = hoursInStage(record, cfg);
    if (inStage == null || inStage <= slaHours) continue;

    const hoursOverdue = Math.round((inStage - slaHours) * 10) / 10;
    const severity = severityFor(hoursOverdue, slaHours);
    const id = `${cfg.entity.toUpperCase()}-BR-${record[cfg.idField]}`;

    recs.push({
      id,
      type: 'sla_breach',
      entity: cfg.entity,
      recordId: record[cfg.idField],
      stage: record[cfg.stageField],
      owner: cfg.ownerField ? (record[cfg.ownerField] || null) : null,
      value: cfg.valueField ? (record[cfg.valueField] != null ? record[cfg.valueField] : null) : null,
      slaHours,
      hoursInStage: Math.round(inStage * 10) / 10,
      hoursOverdue,
      severity,
      recommendedAction: cfg.actionForRecord
        ? cfg.actionForRecord(record, hoursOverdue)
        : `${cfg.entity} ${record[cfg.idField]} is ${hoursOverdue}h past its ${slaHours}h SLA in stage "${record[cfg.stageField]}" — escalate to ${record[cfg.ownerField] || 'the assigned owner'}.`,
      createdAt: new Date().toISOString()
    });
  }
  // Worst first.
  recs.sort((a, b) => b.hoursOverdue - a.hoursOverdue);
  return recs;
}

module.exports = { detectStageBreaches, hoursInStage, severityFor };
