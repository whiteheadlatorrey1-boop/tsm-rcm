'use strict';
const { getWeightedBlueprint } = require('./weighted-blueprints');

const validScore = (n) => Number.isFinite(n) && n >= 0 && n <= 100;

// evidence: [{ domainId, score (0-100) }]   practice, scenario and lab results per domain
// sims:     [{ score, questions, minutes }] timed simulations, oldest first
// A simulation only counts as "full" if it has at least the real exam's question count
// and was finished within the real exam's time limit.
function evaluateWeightedReadiness(blueprintId, evidence, sims) {
  const bp = getWeightedBlueprint(blueprintId);
  const rules = bp.readiness;
  const rows = Array.isArray(evidence) ? evidence : [];
  const simRows = Array.isArray(sims) ? sims : [];
  const reasons = [];

  const domains = bp.domains.map((d) => {
    const mine = rows.filter((e) => e && e.domainId === d.id && validScore(e.score));
    const n = mine.length;
    const score = n ? mine.reduce((s, e) => s + e.score, 0) / n : null;
    let status = 'ok';
    if (n < rules.minSamplesPerDomain) { status = 'insufficient-samples'; reasons.push(`${d.id}: ${n}/${rules.minSamplesPerDomain} samples`); }
    else if (score < rules.domainFloor) { status = 'below-floor'; reasons.push(`${d.id}: ${score.toFixed(1)} is below the ${rules.domainFloor} floor`); }
    return { domainId: d.id, name: d.name, weight: d.weight, score, sampleSize: n, status };
  });

  const covered = domains.filter((d) => d.score !== null);
  const coveredWeight = covered.reduce((s, d) => s + d.weight, 0);
  const weightedScore = coveredWeight ? covered.reduce((s, d) => s + d.weight * d.score, 0) / coveredWeight : null;
  if (coveredWeight < 100) reasons.push(`only ${coveredWeight}% of the blueprint weight has any evidence`);
  else if (weightedScore < rules.readyTarget) reasons.push(`weighted score ${weightedScore.toFixed(1)} is below the ${rules.readyTarget} target`);

  const full = simRows.filter((s) => s && validScore(s.score) && s.questions >= bp.exam.questions && s.minutes <= bp.exam.minutes);
  const lastScores = full.slice(-rules.minFullSims).map((s) => s.score);
  if (full.length < rules.minFullSims) reasons.push(`${full.length}/${rules.minFullSims} full timed simulations`);
  else if (!lastScores.every((s) => s >= rules.readyTarget)) reasons.push(`latest full simulations (${lastScores.join(', ')}) are not all at ${rules.readyTarget}+`);

  const weakDomains = domains
    .filter((d) => d.status !== 'ok' || d.score < rules.readyTarget)
    .map((d) => ({ domainId: d.domainId, priority: d.weight * (rules.readyTarget - (d.score === null ? 0 : d.score)) }))
    .sort((a, b) => b.priority - a.priority);

  const ready = domains.every((d) => d.status === 'ok') && coveredWeight === 100 &&
    weightedScore >= rules.readyTarget && full.length >= rules.minFullSims && lastScores.every((s) => s >= rules.readyTarget);

  return {
    blueprintId, ready,
    label: ready ? 'CERTIFICATION READY' : 'CONTINUE PREP',
    disclaimer: 'Platform readiness determination only. It does not mean the external certification has been earned.',
    weighted: { score: weightedScore, coveredWeight },
    domains,
    sims: { fullCount: full.length, lastScores },
    weakDomains, reasons,
  };
}

module.exports = { evaluateWeightedReadiness };
