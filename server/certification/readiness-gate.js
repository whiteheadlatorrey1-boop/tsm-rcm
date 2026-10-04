'use strict';
const { getBlueprint } = require('./blueprint-registry');

// evidence: [{ skillId, score (0-100), reviewed (bool) }]
// Returns every score together with its sample size, and never marks a
// worker staffing-ready on unreviewed evidence.
function evaluateReadiness(blueprintId, evidence) {
  const bp = getBlueprint(blueprintId);
  const rows = Array.isArray(evidence) ? evidence : [];
  const reasons = [];
  const skills = bp.skills.map((req) => {
    const mine = rows.filter((e) => e && e.skillId === req.id && Number.isFinite(e.score));
    const n = mine.length;
    const score = n ? mine.reduce((s, e) => s + e.score, 0) / n : null;
    const reviewedCount = mine.filter((e) => e.reviewed === true).length;
    let status = 'ok';
    if (n < req.minSamples) { status = 'insufficient-samples'; reasons.push(`${req.id}: ${n}/${req.minSamples} samples`); }
    else if (score < req.minScore) { status = 'below-threshold'; reasons.push(`${req.id}: ${score.toFixed(1)} < ${req.minScore}`); }
    else if (reviewedCount < n) { status = 'unreviewed'; reasons.push(`${req.id}: ${n - reviewedCount} unreviewed sample(s)`); }
    return { skillId: req.id, score, sampleSize: n, minScore: req.minScore, minSamples: req.minSamples, status };
  });
  const scored = skills.filter((s) => s.score !== null);
  const overall = scored.length ? scored.reduce((a, s) => a + s.score, 0) / scored.length : null;
  const overallSamples = skills.reduce((a, s) => a + s.sampleSize, 0);
  if (overall === null || overall < bp.minOverallScore) reasons.push(`overall below ${bp.minOverallScore}`);
  const ready = skills.every((s) => s.status === 'ok') && overall !== null && overall >= bp.minOverallScore;
  return { blueprintId, ready, overall: { score: overall, sampleSize: overallSamples }, skills, reasons };
}

module.exports = { evaluateReadiness };
