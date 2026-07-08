// mdm-decision-engine.js — Phase 5: turns mdm-core.js's raw duplicate/quality output
// into governed, actionable recommendations. Deterministic, no AI dependency (the
// existing SP.mdm Groq route already covers free-text Q&A over MDM state — this is
// the structured decision layer that /api/mdm/recommend/:id/approve actually executes
// against, so it has to be reproducible, not generative).
//
// Recommendation ids are deterministic (derived from domain + record ids), not random,
// because approve/reject look the recommendation back up by id against freshly
// regenerated recommendations on every call — there is no separate "pending
// recommendations" store. This keeps the engine stateless and always in sync with
// current MDM_SEED_DATA, at the cost of a recommendation's id changing if the
// underlying records themselves change out from under it (acceptable: that's exactly
// the case where re-evaluating is correct anyway).

const { findDuplicates, scoreDataset } = require('./mdm-core.js');

// Rough relative blast-radius per domain if bad data ships downstream (financial /
// identity domains weighted highest — a bad GL or customer record propagates further
// than a stale asset tag). Used only to rank recommendations, not to gate them.
const DOMAIN_WEIGHT = {
  customer: 1.0, vendor: 1.0, gl: 1.0,
  costcenter: 0.9, profitcenter: 0.9,
  employee: 0.8, orgunit: 0.75,
  product: 0.7, location: 0.65, asset: 0.6
};

function domainWeight(domain) {
  return DOMAIN_WEIGHT[domain] || 0.7;
}

// Given a duplicate pair, decide which record survives the merge and why. Prefers the
// record with the higher individual quality score (fewer missing fields / format
// violations); falls back to keeping the lower/earlier id on a true tie, since IDs in
// the seed data are assigned roughly in creation order.
function pickSurvivor(recA, recB, scoreById) {
  const aScore = scoreById[recA.id]?.overall ?? 0;
  const bScore = scoreById[recB.id]?.overall ?? 0;
  if (aScore !== bScore) {
    const [survivor, merged] = aScore > bScore ? [recA, recB] : [recB, recA];
    const [survivorScore, mergedScore] = aScore > bScore ? [aScore, bScore] : [bScore, aScore];
    return { survivor, merged, reason: `Higher data quality (${survivorScore}% vs ${mergedScore}%)` };
  }
  const [survivor, merged] = recA.id < recB.id ? [recA, recB] : [recB, recA];
  return { survivor, merged, reason: `Equal data quality (${aScore}%) — kept earlier record ${survivor.id}` };
}

function mergeRecommendationsForDomain(records, domain) {
  const dupes = findDuplicates(records, domain);
  const quality = scoreDataset(records, domain);
  const scoreById = Object.fromEntries(quality.scores.map(s => [s.recordId, s]));

  return dupes.map(d => {
    const { survivor, merged, reason } = pickSurvivor(d.recordA, d.recordB, scoreById);
    const risk = Math.round(Math.min(100, d.matchScore * domainWeight(domain)));
    return {
      id: `REC-${domain}-${[d.recordA.id, d.recordB.id].sort().join('-')}`,
      domain,
      type: 'MERGE_RECORDS',
      action: 'MERGE_RECORDS',
      issue: `Duplicate ${domain} identity: "${d.recordA.name}" / "${d.recordB.name}"`,
      survivorId: survivor.id,
      mergedId: merged.id,
      survivorName: survivor.name,
      mergedName: merged.name,
      reason,
      matchReason: d.matchReason,
      matchField: d.matchField,
      confidence: d.matchScore,
      risk,
      requiresApproval: true,
      status: 'PENDING'
    };
  });
}

// Standalone data-quality flags for records that aren't part of a duplicate pair but
// fall below the quality floor — these are informational (requiresApproval: false),
// there's nothing to execute, just something for a steward to go fix by hand.
function qualityRecommendationsForDomain(records, domain, dupedIds, floor = 70) {
  const quality = scoreDataset(records, domain);
  const out = [];
  for (const s of quality.scores) {
    if (dupedIds.has(s.recordId) || s.overall >= floor) continue;
    const record = records.find(r => r.id === s.recordId);
    out.push({
      id: `REC-${domain}-${s.recordId}-review`,
      domain,
      type: 'QUALITY_REVIEW',
      action: 'FLAG_FOR_REVIEW',
      issue: `Low data quality on ${domain} record "${record ? record.name : s.recordId}" (${s.overall}%)`,
      recordId: s.recordId,
      recordName: record ? record.name : null,
      reason: s.issues.join('; ') || 'Below quality floor',
      confidence: 100 - s.overall,
      risk: Math.round(Math.min(100, (100 - s.overall) * domainWeight(domain))),
      requiresApproval: false,
      status: 'PENDING'
    });
  }
  return out;
}

// seedData: the full { domain: records[] } object (MDM_SEED_DATA from server.js).
function generateRecommendations(seedData) {
  const recs = [];
  for (const domain of Object.keys(seedData)) {
    const records = seedData[domain];
    const mergeRecs = mergeRecommendationsForDomain(records, domain);
    const dupedIds = new Set(mergeRecs.flatMap(r => [r.survivorId, r.mergedId]));
    recs.push(...mergeRecs);
    recs.push(...qualityRecommendationsForDomain(records, domain, dupedIds));
  }
  return recs.sort((a, b) => b.risk - a.risk);
}

// Looks a single recommendation back up by id against freshly generated state — this
// is what /api/mdm/recommend/:id/approve and /reject call before acting, so they never
// trust a stale id from a client that hasn't re-fetched the list.
function findRecommendation(seedData, id) {
  return generateRecommendations(seedData).find(r => r.id === id) || null;
}

module.exports = { generateRecommendations, findRecommendation };
