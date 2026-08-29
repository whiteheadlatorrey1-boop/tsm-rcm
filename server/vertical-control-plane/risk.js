'use strict';

/**
 * Deterministic risk model.
 *
 * This is deliberately transparent and bounded.
 * Vertical adapters may provide domain-specific factors.
 */

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function calculateRisk(input = {}) {
  const severity = Number(input.severity || 0);
  const exposure = Number(input.exposure || 0);
  const probability = Number(input.probability || 0);

  const exposureFactor = Math.min(
    100,
    Math.log10(Math.max(1, exposure)) * 10
  );

  const score = clamp(
    severity * 0.5 +
    exposureFactor * 0.25 +
    probability * 0.25
  );

  let level = 'low';

  if (score >= 75) level = 'critical';
  else if (score >= 50) level = 'high';
  else if (score >= 25) level = 'medium';

  return {
    score: Number(score.toFixed(2)),
    level,
    factors: {
      severity,
      exposure,
      probability,
      exposureFactor
    }
  };
}

module.exports = {
  clamp,
  calculateRisk
};
