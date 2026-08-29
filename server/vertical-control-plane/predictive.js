'use strict';

/**
 * Predictive value normalization.
 *
 * Predictive outputs must expose:
 *   value
 *   horizon
 *   confidence
 *   method
 *
 * They are advisory and never automatically executable.
 */

function normalizePrediction(input = {}) {
  const confidence =
    typeof input.confidence === 'number'
      ? Math.max(0, Math.min(1, input.confidence))
      : null;

  return {
    id:
      input.id ||
      `prediction-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,

    metric: input.metric || null,

    value: input.value ?? null,

    unit: input.unit || null,

    horizon: input.horizon || null,

    confidence,

    method: input.method || 'deterministic-baseline',

    source: input.source || null,

    createdAt: new Date().toISOString()
  };
}

function predictionSet(predictions = []) {
  return predictions.map(normalizePrediction);
}

module.exports = {
  normalizePrediction,
  predictionSet
};
