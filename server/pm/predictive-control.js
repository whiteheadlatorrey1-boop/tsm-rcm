'use strict';

/**
 * TSM PM Predictive Portfolio Control v1
 *
 * Purpose:
 *   Convert deterministic PM decisions into forward-looking management
 *   signals without pretending to have live source-system writeback.
 *
 * Design:
 *   V1 Decision Engine = what is known now
 *   V3 Intelligence    = what action should be governed
 *   V4 Predictive      = what is likely to happen next
 *
 * No LLM is required for the predictive calculation.
 */

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function text(value, fallback = '') {
  return value === undefined || value === null
    ? fallback
    : String(value).trim();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function probabilityFrom(action) {
  const priority = text(action.priority).toUpperCase();
  const exposure = num(action.exposure);

  let probability = 0.20;

  if (priority === 'CRITICAL') probability += 0.35;
  else if (priority === 'HIGH') probability += 0.20;
  else if (priority === 'MEDIUM') probability += 0.10;

  if (exposure >= 25000) probability += 0.15;
  else if (exposure >= 5000) probability += 0.08;

  if (text(action.urgency).toLowerCase() === 'immediate') {
    probability += 0.10;
  }

  return clamp(Number(probability.toFixed(2)), 0.05, 0.95);
}

function classifyHorizon(probability) {
  if (probability >= 0.75) return '0-7 DAYS';
  if (probability >= 0.55) return '7-30 DAYS';
  return '30-90 DAYS';
}

function buildPrediction(action) {
  const probability = probabilityFrom(action);
  const exposure = num(action.exposure);

  const expectedExposure = Math.round(exposure * probability);

  let signal = 'WATCH';
  if (probability >= 0.75) signal = 'LIKELY';
  else if (probability >= 0.55) signal = 'ELEVATED';

  return {
    actionId: action.id,
    decisionId: action.decisionId,
    entityId: action.entityId,
    domain: action.domain,
    signal,
    probability,
    horizon: classifyHorizon(probability),
    currentExposure: exposure,
    expectedExposure,
    rationale:
      `Based on current priority, urgency, and modeled exposure, ` +
      `the condition has a ${Math.round(probability * 100)}% modeled likelihood ` +
      `of requiring continued management attention.`,
    deterministic: true
  };
}

function buildPmPredictiveControl(intelligence) {
  const actions = Array.isArray(intelligence && intelligence.actions)
    ? intelligence.actions
    : [];

  const predictions = actions
    .filter(action => text(action.status, 'OPEN').toUpperCase() !== 'VERIFIED')
    .map(buildPrediction);

  const predictedExposure = predictions.reduce(
    (sum, item) => sum + num(item.expectedExposure),
    0
  );

  const likely = predictions.filter(
    item => item.signal === 'LIKELY'
  ).length;

  const elevated = predictions.filter(
    item => item.signal === 'ELEVATED'
  ).length;

  return {
    ok: true,
    engine: 'pm-predictive-control-v1',
    generatedAt: new Date().toISOString(),

    predictionSummary: {
      total: predictions.length,
      likely,
      elevated,
      watch: predictions.length - likely - elevated,
      predictedExposure
    },

    predictions,

    controlRecommendations: predictions
      .filter(item => item.signal !== 'WATCH')
      .sort((a, b) => b.expectedExposure - a.expectedExposure)
      .map(item => ({
        actionId: item.actionId,
        entityId: item.entityId,
        priority:
          item.signal === 'LIKELY' ? 'IMMEDIATE ATTENTION' : 'MANAGEMENT REVIEW',
        recommendation:
          item.signal === 'LIKELY'
            ? `Act now on ${item.entityId} to reduce the probability of continued exposure.`
            : `Review ${item.entityId} and establish a mitigation plan before exposure increases.`,
        expectedExposure: item.expectedExposure,
        horizon: item.horizon
      })),

    governance: {
      mode: 'DETERMINISTIC',
      llmRequired: false,
      humanApprovalRequired: true,
      sourceSystemWriteback: false,
      predictiveValuesAreModeled: true
    }
  };
}

module.exports = {
  buildPmPredictiveControl,
  buildPrediction
};
