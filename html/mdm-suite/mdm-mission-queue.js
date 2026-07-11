// mdm-mission-queue.js — Phase 7: Mission Queue. Deterministic, server-side,
// no AI dependency. Layers claim/assignment/queue-position state on top of
// whatever generateRecommendations() currently returns (Phase 5), so the
// queue is always derived from live data rather than a second copy of it.
//
// A "mission" here IS an open recommendation (merge or quality_review) plus
// claim metadata. Resolving the underlying recommendation (approve/reject)
// is what retires a mission -- there's no separate resolve step to keep in
// sync, which is the same principle Phase 5 used to avoid stale state.
//
// Phase 7.1 — Exception Intelligence (priority by impact, not a flat queue).
// generateRecommendations() only exposes risk (HIGH/MEDIUM/LOW) and
// confidence (0-100) -- there is no financial-value field anywhere in the
// dataset, unlike e.g. BPO's engagement records. Rather than fabricate a
// dollar figure, priority is computed from the two real signals that exist
// (risk + confidence), and an estimated dollar impact is only ever surfaced
// when the caller explicitly supplies domainImpactWeights (e.g. sourced from
// finance: "a bad vendor record costs ~$X to clean up/reconcile"). Missions
// without a supplied weight report estimatedImpact: null -- never a guess
// presented as fact -- and the summary tracks how many are unestimated so a
// partial dollar sum can never be misread as total exposure.

const RISK_WEIGHT = { HIGH: 3, MEDIUM: 2, LOW: 1 };

/**
 * computePriority(rec, opts)
 * rec: a single recommendation from generateRecommendations() -- must have
 *   .risk and .confidence at minimum.
 * opts.domainImpactWeights: optional { [domain]: dollarsPerFullConfidenceItem }.
 *   When supplied for rec.domain, estimatedImpact = weight * (confidence/100),
 *   rounded. When not supplied, estimatedImpact is null (not zero, not a
 *   default guess -- explicitly "not estimated").
 */
function computePriority(rec, opts) {
  opts = opts || {};
  const domainWeights = opts.domainImpactWeights || {};

  const riskWeight = RISK_WEIGHT[rec.risk] != null ? RISK_WEIGHT[rec.risk] : 1;
  const confidence = typeof rec.confidence === 'number' ? rec.confidence : 0;
  const confidenceFactor = confidence / 100;

  // Deterministic composite used only to order within a priority tier, not
  // shown to users as a standalone metric.
  const priorityScore = Math.round((riskWeight * 10 + confidenceFactor * 10) * 10) / 10;

  let priority;
  if (rec.risk === 'HIGH' && confidence >= 90) priority = 'P1';
  else if (rec.risk === 'HIGH' || (rec.risk === 'MEDIUM' && confidence >= 85)) priority = 'P2';
  else priority = 'P3';

  const hasWeight = Object.prototype.hasOwnProperty.call(domainWeights, rec.domain);
  const estimatedImpact = hasWeight
    ? Math.round(domainWeights[rec.domain] * confidenceFactor)
    : null;

  return { priority, priorityScore, estimatedImpact };
}

function buildQueue(dataset, resolvedIds, claims, opts) {
  // eslint-disable-next-line global-require
  const { generateRecommendations } = require('./mdm-decision-engine.js');
  const recs = generateRecommendations(dataset, resolvedIds);

  // Re-rank: priority tier first (P1 > P2 > P3), then the existing
  // risk/confidence ordering generateRecommendations() already applied
  // within a tier (it returns highest risk + confidence first).
  const tierRank = { P1: 0, P2: 1, P3: 2 };
  const withPriority = recs.map(rec => ({ rec, p: computePriority(rec, opts) }));
  withPriority.sort((a, b) => tierRank[a.p.priority] - tierRank[b.p.priority]);

  return withPriority.map(({ rec, p }, i) => {
    const claim = claims.get(rec.id) || null;
    return {
      ...rec,
      priority: p.priority,
      priorityScore: p.priorityScore,
      estimatedImpact: p.estimatedImpact,
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
  const byPriority = { P1: 0, P2: 0, P3: 0 };
  let estimatedImpactTotal = 0;
  let estimatedImpactCount = 0;
  let unestimatedCount = 0;

  queue.forEach(m => {
    byStatus[m.missionStatus] = (byStatus[m.missionStatus] || 0) + 1;
    byRisk[m.risk] = (byRisk[m.risk] || 0) + 1;
    byPriority[m.priority] = (byPriority[m.priority] || 0) + 1;
    if (m.estimatedImpact != null) {
      estimatedImpactTotal += m.estimatedImpact;
      estimatedImpactCount += 1;
    } else {
      unestimatedCount += 1;
    }
  });

  return {
    total: queue.length,
    byStatus,
    byRisk,
    byPriority,
    // Explicitly partial unless unestimatedCount is 0 -- callers must check
    // unestimatedCount before presenting this as a total.
    estimatedImpactTotal,
    estimatedImpactCount,
    unestimatedCount
  };
}

module.exports = { buildQueue, summarize, computePriority };