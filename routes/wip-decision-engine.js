// wip-decision-engine.js — auto-generation layer for WIP's existing decision queue.
// WIP already has the workflow half of the MDM pattern (WIP_DECISIONS + approve/reject
// via PATCH /api/wip/decision/:id, persisted to wip-master.json) — what it was missing
// is anything actually generating those decisions from real data. This scans tasks and
// readiness for the same two signals a human PM would flag by hand: overdue high-risk
// work, and readiness scores that have dropped below a usable threshold.
//
// Generated decisions carry a `sourceKey` so re-running generation is idempotent — it
// won't create a second pending decision for the same underlying condition, but WILL
// create a new one if the same condition recurs after a prior instance was resolved
// (approved/rejected), since that's a genuinely new occurrence worth a human look.

const READINESS_FLOOR = 50;

function isOverdue(due) {
  if (!due) return false;
  const t = new Date(due).getTime();
  return !isNaN(t) && t < Date.now();
}

function computeReadinessOverall(r) {
  if (!r) return null;
  const fields = ['dataCompleteness', 'stakeholderCoverage', 'mitigationPlans', 'resourceAvailability', 'openRisks'];
  const vals = fields.map(f => Number(r[f])).filter(n => !isNaN(n));
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function generateCandidates(vertical, tasks, readiness) {
  const candidates = [];

  for (const t of (tasks || [])) {
    if (t.status === 'DONE') continue;
    if (isOverdue(t.due) && t.risk === 'HIGH') {
      candidates.push({
        sourceKey: `task-overdue-${t.id}`,
        title: `Overdue high-risk task: ${t.action}`,
        impact: `Owner ${t.owner} · due ${t.due} · still ${t.status}`,
        cost: '',
        recommendation: 'Escalate ownership or reassign; confirm a mitigation plan exists',
        confidence: 85
      });
    }
  }

  const overall = computeReadinessOverall(readiness);
  if (overall !== null && overall < READINESS_FLOOR) {
    candidates.push({
      sourceKey: `readiness-low-${vertical}`,
      title: `Readiness score critically low (${overall}%)`,
      impact: 'Go-live / milestone readiness at risk',
      cost: '',
      recommendation: 'Schedule a readiness review; identify the weakest dimension and assign an owner',
      confidence: 90
    });
  }

  return candidates;
}

// Returns only the candidates that don't already have a PENDING decision with the same
// sourceKey — this is what makes repeated calls idempotent instead of spamming the queue.
function generateNewRecommendations(vertical, tasks, readiness, existingDecisions) {
  const candidates = generateCandidates(vertical, tasks, readiness);
  const pendingKeys = new Set(
    (existingDecisions || []).filter(d => d.status === 'PENDING' && d.sourceKey).map(d => d.sourceKey)
  );
  return candidates.filter(c => !pendingKeys.has(c.sourceKey));
}

module.exports = { generateNewRecommendations, computeReadinessOverall };
