'use strict';

/**
 * TSM PM Exposure Forecast Engine v2
 *
 * Conservative deterministic planning model.
 * Values are modeled, not accounting/book-of-record values.
 */

const VERSION = 'pm-forecast-engine-v2';

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function forecast(payload = {}, twin = {}, risk = {}) {
  const financials =
    payload.sections?.financials ||
    payload.financials ||
    {};

  const current = num(
    financials.total_exposure ??
    payload.total_exposure ??
    payload.totalExposure ??
    twin.exposure
  );

  const riskMultiplier =
    risk.score >= 75 ? 1.30 :
    risk.score >= 50 ? 1.20 :
    risk.score >= 25 ? 1.10 :
    1.05;

  const projected = Math.round(current * riskMultiplier);

  const avoidable = Math.max(
    0,
    projected - current
  );

  return {
    version: VERSION,
    generatedAt: new Date().toISOString(),

    currentExposure: current,

    modeledProjection: {
      horizon: 'planning horizon',
      projectedExposure: projected,
      incrementalExposure: avoidable
    },

    scenario: {
      condition: 'If currently identified risks remain unresolved',
      projectedIncrementalExposure: avoidable,
      riskMultiplier
    },

    disclaimer:
      'Forecast values are modeled planning figures and are not guaranteed financial outcomes.',

    methodology: 'DETERMINISTIC',
    humanApprovalRequired: true
  };
}

module.exports = {
  VERSION,
  forecast
};
