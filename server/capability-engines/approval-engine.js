const { detectStageBreaches } = require('./stage-breach-engine');

// Approval's SLA is keyed by request *type* (e.g. "Purchase Order"), and only
// applies while a request is still open (submitted / pending_review /
// escalated) — decided requests (approved/rejected) are terminal.
const OPEN_STAGES = new Set(['Submitted', 'Pending Review', 'Escalated']);

function slaLookup(slaByType) {
  return (record) => {
    if (!OPEN_STAGES.has(record.stage)) return null;
    const sla = slaByType[record.type];
    return (sla === undefined) ? null : sla;
  };
}

function generateRecommendations(approvalModel) {
  const sample = approvalModel.sample_data || {};
  const requests = sample.requests || [];
  const approvers = sample.approvers || [];
  const slaByType = (approvalModel.thresholds || {}).sla_hours || {};

  const recs = detectStageBreaches(requests, {
    entity: 'approval_request', idField: 'request_id', stageField: 'stage',
    ownerField: 'approver', valueField: 'amount',
    timestampField: 'submitted_at',
    slaHoursForRecord: slaLookup(slaByType),
    actionForRecord: (r, h) => `Request ${r.request_id} (${r.type}, requested by ${r.requestor}) is ${h}h past SLA with ${r.approver} — reassign or escalate.`
  });

  // Delegation-conflict signal: an open request assigned to an approver who's
  // on leave won't move regardless of SLA math, so flag it separately.
  const onLeave = new Set(approvers.filter(a => a.on_leave).map(a => a.name));
  for (const r of requests) {
    if (OPEN_STAGES.has(r.stage) && onLeave.has(r.approver)) {
      recs.push({
        id: `APR-DELEGATION-${r.request_id}`,
        type: 'delegation_conflict',
        entity: 'approval_request',
        recordId: r.request_id,
        stage: r.stage,
        owner: r.approver,
        value: r.amount != null ? r.amount : null,
        severity: 'high',
        recommendedAction: `Request ${r.request_id} is assigned to ${r.approver}, who is on leave — reassign to an active approver.`,
        createdAt: new Date().toISOString()
      });
    }
  }

  recs.sort((a, b) => (b.hoursOverdue || 0) - (a.hoursOverdue || 0));
  return recs;
}

module.exports = { generateRecommendations };
