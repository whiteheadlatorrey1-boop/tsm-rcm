// tsm-exposure-impact-engine.js
//
// Deterministic act-vs-ignore exposure delta calculator for Executive Reports.
//
// This is NOT a predictive model and does not call an LLM. Every number it
// produces is derived from inputs the platform already computes elsewhere
// (Sentinel's severity weighting, the war room's reported exposure range,
// the explainability contract's confidence score, and a deadline if known).
// Each output field carries a `basis` string explaining exactly how it was
// derived, so it can sit in front of a decision maker without being mistaken
// for an AI-generated forecast.
//
// Deliberately distinct from:
//   - server/enterprise/bnca-engine.js  (live capability-decision router,
//     the platform's single decision authority — do not rename/collide)
//   - html/js/tsm-bnca-engine.js         (orphaned mission gate/rules engine)
//
// Usage (browser):
//   TSMExposureImpactEngine.computeActionImpact({
//     exposureValue: 50000, severity: 'HIGH', confidence: 82, daysUntilDeadline: 12
//   });
//
// Usage (node):
//   const { computeActionImpact } = require('./tsm-exposure-impact-engine.js');

(function (global) {
  'use strict';

  // Same relative shape as Sentinel's SEV_POINTS (CRIT:25, HIGH:15, MED:8, LOW:4),
  // scaled to a per-week compounding rate so a CRIT and a LOW differ the same
  // way here as they do everywhere else in the platform.
  var WEEKLY_ESCALATION_RATE = { CRIT: 0.15, HIGH: 0.08, MED: 0.04, LOW: 0.01 };

  // Acting rarely zeroes exposure outright (admin/legal tail usually remains).
  var ACTED_RESIDUAL_FLOOR = 0.10;

  // Used when no deadline is available so ifIgnored still has a defined horizon.
  var DEFAULT_HORIZON_WEEKS = 4;

  var VALID_SEVERITIES = { CRIT: 1, HIGH: 1, MED: 1, LOW: 1 };

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  function normalizeSeverity(severity) {
    var s = (severity || 'MED').toString().toUpperCase();
    return VALID_SEVERITIES[s] ? s : 'MED';
  }

  function computeActionImpact(input) {
    input = input || {};

    var baseExposure = typeof input.exposureValue === 'number' && !isNaN(input.exposureValue)
      ? input.exposureValue
      : 0;

    var severity = normalizeSeverity(input.severity);

    var confidence = typeof input.confidence === 'number' && !isNaN(input.confidence)
      ? Math.max(0, Math.min(100, input.confidence))
      : 50;

    var hasDeadline = typeof input.daysUntilDeadline === 'number' && !isNaN(input.daysUntilDeadline);
    var weeks = hasDeadline
      ? Math.max(input.daysUntilDeadline, 0) / 7
      : DEFAULT_HORIZON_WEEKS;

    var rate = WEEKLY_ESCALATION_RATE[severity];

    var ignoredExposure = baseExposure * (1 + rate * weeks);
    var actedFactor = Math.max(ACTED_RESIDUAL_FLOOR, 1 - (confidence / 100));
    var actedExposure = baseExposure * actedFactor;

    var weeksLabel = weeks.toFixed(1);

    return {
      currentExposure: round2(baseExposure),
      ifActed: {
        exposure: round2(actedExposure),
        basis: 'Resolved toward a ' + Math.round(ACTED_RESIDUAL_FLOOR * 100) +
          '% residual floor, scaled by recommendation confidence (' + confidence + '%)'
      },
      ifIgnored: {
        exposure: round2(ignoredExposure),
        basis: 'Base exposure compounding at ' + Math.round(rate * 100) + '%/week (' +
          severity + '-derived) over ' + weeksLabel + ' weeks' +
          (hasDeadline ? ' to deadline' : ' (default horizon — no deadline supplied)')
      },
      delta: round2(ignoredExposure - actedExposure),
      urgencyWindow: hasDeadline
        ? (input.daysUntilDeadline <= 21
            ? 'Escalates materially within ' + weeksLabel + ' weeks (deadline-driven)'
            : 'Deadline-driven, ' + weeksLabel + ' weeks out')
        : 'No deadline supplied — ' + DEFAULT_HORIZON_WEEKS + '-week default horizon used',
      methodology: 'Deterministic — severity/exposure weighting derived from Sentinel, no predictive model or LLM estimate'
    };
  }

  var api = {
    computeActionImpact: computeActionImpact,
    WEEKLY_ESCALATION_RATE: WEEKLY_ESCALATION_RATE,
    ACTED_RESIDUAL_FLOOR: ACTED_RESIDUAL_FLOOR,
    DEFAULT_HORIZON_WEEKS: DEFAULT_HORIZON_WEEKS
  };

  global.TSMExposureImpactEngine = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);