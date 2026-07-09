// mdm-mission-queue.js — Phase 7: Mission Queue. Deterministic, server-side,
// no AI dependency. Layers claim/assignment/queue-position state on top of
// whatever generateRecommendations() currently returns (Phase 5), so the
// queue is always derived from live data rather than a second copy of it.
//
// A "mission" here IS an open recommendation (merge or quality_review) plus
// claim metadata. Resolving the underlying recommendation (approve/reject)
// is what retires a mission -- there's no separate resolve step to keep in
// sync, which is the same principle Phase 5 used to avoid stale state.

function buildQueue(dataset, resolvedIds, claims) {
  // eslint-disable-next-line global-require
  const { generateRecommendations } = require('./mdm-decision-engine.js');
  const recs = generateRecommendations(dataset, resolvedIds);

  return recs.map((rec, i) => {
    const claim = claims.get(rec.id) || null;
    return {
      ...rec,
      queuePosition: i + 1,
      missionStatus: claim ? 'CLAIMED' : 'QUEUED',
      claimedBy: claim ? claim.actor : null,
      claimedAt: claim ? claim.claimedAt : null
    };
  });
}

function summarize(queue) {
  const byStatus = { QUEUED: 0, CLAIMED: 0 };
  const byRisk = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  queue.forEach(m => {
    byStatus[m.missionStatus] = (byStatus[m.missionStatus] || 0) + 1;
    byRisk[m.risk] = (byRisk[m.risk] || 0) + 1;
  });
  return { total: queue.length, byStatus, byRisk };
}

module.exports = { buildQueue, summarize };