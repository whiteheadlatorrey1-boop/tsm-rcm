// tsm-bnca-exposure-engine.js
//
// Deterministic Business-Not-Content-Analysis exposure projection.
//
// Ground rule: every number here traces back to data the vertical's own
// war room / Sentinel already reports (severity, exposure range, deadline,
// recommendation confidence). No new inputs, no ML, no LLM-guessed dollars.
//
// This is NOT the same file as html/js/tsm-bnca-engine.js (which is a
// separate PASS/ESCALATE/BLOCK mission-approval rules engine). Do not merge
// or rename these into each other.
//
// Usage:
//   const impact = TSMBNCAExposureEngine.project({
//     baseExposure: 50000,      // conservative (low) end of reported range
//     severity: 'HIGH',         // CRIT | HIGH | MED | LOW
//     confidence: 90,           // 0-100, recommendation confidence
//     daysUntilDeadline: 22     // optional, defaults to 0 (no deadline signal)
//   });

(function (global) {
  'use strict';

  // Same relative shape as Sentinel's SEV_POINTS (25/15/8/4), scaled down
  // proportionally so severity affects escalation the same way everywhere
  // in the platform — not a new, independently-invented scale.
  var WEEKLY_ESCALATION_RATE = { CRIT: 0.15, HIGH: 0.08, MED: 0.04, LOW: 0.01 };

  // Acting rarely zeroes exposure outright — admin/legal tail remains.
  var ACTED_RESIDUAL_FLOOR = 0.10;

  var DEFAULT_RATE = WEEKLY_ESCALATION_RATE.MED;

  function normalizeSeverity(sev) {
    var s = String(sev || '').toUpperCase();
    return WEEKLY_ESCALATION_RATE.hasOwnProperty(s) ? s : 'MED';
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function round(n) {
    return Math.round(n);
  }

  /**
   * project({ baseExposure, severity, confidence, daysUntilDeadline })
   * Returns { currentExposure, ifActed, ifIgnored, delta, urgencyWindow, methodology }
   */
  function project(input) {
    input = input || {};

    var baseExposure = Number(input.baseExposure);
    if (!Number.isFinite(baseExposure) || baseExposure < 0) baseExposure = 0;

    var severity = normalizeSeverity(input.severity);

    var confidence = Number(input.confidence);
    if (!Number.isFinite(confidence)) confidence = 70; // neutral default, not invented dollars
    confidence = clamp(confidence, 0, 100);

    var daysUntilDeadline = Number(input.daysUntilDeadline);
    if (!Number.isFinite(daysUntilDeadline) || daysUntilDeadline < 0) daysUntilDeadline = 0;

    var weeksToDeadline = daysUntilDeadline / 7;
    var rate = WEEKLY_ESCALATION_RATE[severity] || DEFAULT_RATE;

    var ignoredExposure = baseExposure * (1 + rate * weeksToDeadline);
    var actedMultiplier = Math.max(ACTED_RESIDUAL_FLOOR, 1 - confidence / 100);
    var actedExposure = baseExposure * actedMultiplier;

    var ifIgnored = {
      exposure: round(ignoredExposure),
      basis: 'Base exposure compounding at ' + (rate * 100).toFixed(0) +
        '%/week (severity-derived) over ' + weeksToDeadline.toFixed(1) + ' weeks to deadline'
    };

    var ifActed = {
      exposure: round(actedExposure),
      basis: 'Resolved toward residual floor, scaled by recommendation confidence (' + confidence + '%)'
    };

    var delta = ifIgnored.exposure - ifActed.exposure;

    var urgencyWindow;
    if (weeksToDeadline <= 0) {
      urgencyWindow = 'No deadline signal available';
    } else if (weeksToDeadline <= 4) {
      urgencyWindow = 'Escalates materially within ' + Math.ceil(weeksToDeadline) + ' week' +
        (Math.ceil(weeksToDeadline) === 1 ? '' : 's') + ' (deadline-driven)';
    } else {
      urgencyWindow = 'Escalates gradually over ' + Math.ceil(weeksToDeadline) + ' weeks (deadline-driven)';
    }

    return {
      currentExposure: round(baseExposure),
      ifActed: ifActed,
      ifIgnored: ifIgnored,
      delta: delta,
      urgencyWindow: urgencyWindow,
      methodology: 'Deterministic \u2014 severity/exposure weighting from Sentinel, no predictive model'
    };
  }

  var TSMBNCAExposureEngine = { project: project };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TSMBNCAExposureEngine;
  } else {
    global.TSMBNCAExposureEngine = TSMBNCAExposureEngine;
  }
})(typeof window !== 'undefined' ? window : this);
