// mdm-decision-engine.js — Phase 5: deterministic recommendation generation on
// top of mdm-core.js. No AI dependency, no hidden state — recommendations are
// recomputed fresh from whatever the current dataset actually looks like, so
// approving one and re-fetching never shows a stale/already-resolved item.

const { findDuplicates, scoreDataset } = require('./mdm-core.js');

// Deterministic survivor pick for a duplicate pair: higher quality score wins;
// ties broken by completeness, then by whichever record has the lower/earlier
// id (stable, not random) so the same pair always recommends the same survivor.
function pickSurvivor(recA, recB, scoredById) {
  const sa = scoredById[recA.id] || { overall: 0, completeness: 0 };
  const sb = scoredById[recB.id] || { overall: 0, completeness: 0 };
  if (sa.overall !== sb.overall) return sa.overall > sb.overall ? recA : recB;
  if (sa.completeness !== sb.completeness) return sa.completeness > sb.completeness ? recA : recB;
  return recA.id <= recB.id ? recA : recB;
}

function stableMergeId(domain, idA, idB) {
  const [x, y] = [idA, idB].sort();
  return `REC-MERGE-${domain}-${x}~${y}`;
}
function stableQualityId(domain, recordId) {
  return `REC-QUALITY-${domain}-${recordId}`;
}

// Generates the full current set of open recommendations across every domain
// in `dataset` (an object keyed by domain -> records[]). `resolvedIds` is a
// Set of recommendation ids that have already been explicitly acted on (used
// only for quality-review recs, which don't remove the underlying record --
// merge recs naturally disappear once one side of the pair is retired).
function generateRecommendations(dataset, resolvedIds) {
  resolvedIds = resolvedIds || new Set();
  const recommendations = [];

  for (const domain of Object.keys(dataset)) {
    const records = dataset[domain];
    if (!records || !records.length) continue;

    const scored = scoreDataset(records, domain);
    const scoredById = {};
    scored.scores.forEach(s => { scoredById[s.recordId] = s; });

    const dupes = findDuplicates(records, domain);
    const inDuplicateCluster = new Set();

    dupes.forEach(m => {
      const id = stableMergeId(domain, m.recordA.id, m.recordB.id);
      if (resolvedIds.has(id)) return;
      inDuplicateCluster.add(m.recordA.id);
      inDuplicateCluster.add(m.recordB.id);
      const survivor = pickSurvivor(m.recordA, m.recordB, scoredById);
      const loser = survivor.id === m.recordA.id ? m.recordB : m.recordA;
      const survivorScore = scoredById[survivor.id]?.overall ?? 0;
      const loserScore = scoredById[loser.id]?.overall ?? 0;
      recommendations.push({
        id,
        domain,
        type: 'merge',
        survivorId: survivor.id,
        survivorName: survivor.name,
        mergedId: loser.id,
        mergedName: loser.name,
        matchScore: m.matchScore,
        matchReason: m.matchReason,
        matchField: m.matchField,
        confidence: m.matchScore,
        risk: m.matchScore >= 95 ? 'HIGH' : m.matchScore >= 88 ? 'MEDIUM' : 'LOW',
        reasoning: `${survivor.name} (quality ${survivorScore}) recommended to survive over ` +
          `${loser.name} (quality ${loserScore}) -- ${m.matchReason === 'identifier_exact'
            ? `records share identical ${m.matchField}` : `${m.matchScore}% name/field similarity`}.`,
        status: 'OPEN'
      });
    });

    scored.scores.forEach(s => {
      if (s.overall >= 70) return;              // only flag genuinely low-quality records
      if (inDuplicateCluster.has(s.recordId)) return; // already covered by a merge rec
      const id = stableQualityId(domain, s.recordId);
      if (resolvedIds.has(id)) return;
      const record = records.find(r => r.id === s.recordId);
      recommendations.push({
        id,
        domain,
        type: 'quality_review',
        recordId: s.recordId,
        recordName: record ? record.name : s.recordId,
        qualityScore: s.overall,
        issues: s.issues,
        confidence: 100 - s.overall,
        risk: s.overall < 40 ? 'HIGH' : s.overall < 60 ? 'MEDIUM' : 'LOW',
        reasoning: `Quality score ${s.overall}/100 -- ${s.issues.join('; ') || 'below acceptable threshold'}.`,
        status: 'OPEN'
      });
    });
  }

  // Highest risk first, so the mission queue / exec view lead with what matters most.
  const riskRank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  recommendations.sort((a, b) => (riskRank[a.risk] - riskRank[b.risk]) || (b.confidence - a.confidence));
  return recommendations;
}

module.exports = { generateRecommendations, stableMergeId, stableQualityId };
