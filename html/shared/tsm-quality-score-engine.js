/**
 * TSM Quality Score Engine v1.0
 * --------------------------------------------------------------------------
 * BPO Enterprise Roadmap #2 — Quality Assurance Command Center.
 *
 * Generalizes the scoring approach already proven in MDM
 * (html/mdm-suite/mdm-core.js -> scoreRecord/scoreDataset, which scores
 * Completeness + Format/Validity per record) into a shared engine that also
 * consumes the explainability contract every other vertical already
 * produces via getExplainItems() -> { id, claim, confidence, severity,
 * impact, rationale, sources, dataPoints } (see tsm-exec-framework.js).
 *
 * Two adapters in, one score shape out:
 *   { accuracy, completeness, compliance, confidence, overall, band, items }
 *
 * - fromExplainItems(items, opts): for CRM / O2C / CPQ / Catalog / Approval /
 *   BPO / NOC / Governance / Integration Hub engines — anything that already
 *   implements getExplainItems(). No new instrumentation required.
 * - fromMdmScore(scoreDatasetResult): adapter for MDM's existing
 *   completeness/formatScore output, so MDM gets the same unified shape
 *   without changing mdm-core.js.
 *
 * Works in both the browser (war-room-prep.html, exec portals) and Node
 * (server.js), same dual-environment pattern as tsm-war-room-registry.js.
 * ========================================================================== */

(function (global) {
  'use strict';

  var SEVERITY_PENALTY = { high: 18, med: 8, low: 2 };
  var BAND_THRESHOLDS = [
    { min: 95, band: 'EXCELLENT' },
    { min: 85, band: 'STRONG' },
    { min: 70, band: 'ACCEPTABLE' },
    { min: 50, band: 'AT RISK' },
    { min: 0, band: 'CRITICAL' }
  ];

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function round(n) { return Math.round(n); }

  function bandFor(overall) {
    for (var i = 0; i < BAND_THRESHOLDS.length; i++) {
      if (overall >= BAND_THRESHOLDS[i].min) return BAND_THRESHOLDS[i].band;
    }
    return 'CRITICAL';
  }

  /**
   * fromExplainItems(items, opts)
   * items: the raw array returned by an engine's getExplainItems().
   * opts.recordCount: total records/cases the engine evaluated (for context
   *   only — not required for the math). Used to compute "clean rate".
   * opts.requiredComplianceIds: optional array of explain-item ids that must
   *   be absent (i.e. resolved) for a 100% Compliance sub-score. If any of
   *   those ids are present in `items`, Compliance is docked.
   */
  function fromExplainItems(items, opts) {
    opts = opts || {};
    var norm = Array.isArray(items) ? items.filter(function (it) { return it && it.claim; }) : [];

    // Accuracy: how much penalty the open findings carry, weighted by severity.
    var penalty = norm.reduce(function (sum, it) {
      var sev = it.severity && SEVERITY_PENALTY[it.severity] != null ? it.severity : 'med';
      return sum + SEVERITY_PENALTY[sev];
    }, 0);
    var accuracy = clamp(100 - penalty, 0, 100);

    // Confidence: average model confidence across open findings. No findings
    // at all is treated as full confidence (nothing to be unsure about).
    var confItems = norm.filter(function (it) { return typeof it.confidence === 'number'; });
    var confidence = confItems.length
      ? clamp(round(confItems.reduce(function (s, it) { return s + it.confidence; }, 0) / confItems.length), 0, 100)
      : 100;

    // Completeness: proxy from recordCount context when supplied, else from
    // how many findings actually carry dataPoints/rationale (a finding with
    // no supporting evidence is itself a completeness gap).
    var withEvidence = norm.filter(function (it) {
      return (Array.isArray(it.dataPoints) && it.dataPoints.length) || it.rationale;
    }).length;
    var completeness = norm.length
      ? clamp(round((withEvidence / norm.length) * 100), 0, 100)
      : 100;

    // Compliance: docked per required-but-unresolved item, else derived from
    // high-severity share of open findings (compliance findings are usually
    // tagged high).
    var compliance;
    if (Array.isArray(opts.requiredComplianceIds) && opts.requiredComplianceIds.length) {
      var openIds = norm.map(function (it) { return it.id; });
      var unresolved = opts.requiredComplianceIds.filter(function (id) { return openIds.indexOf(id) !== -1; });
      compliance = clamp(round(100 - (unresolved.length / opts.requiredComplianceIds.length) * 100), 0, 100);
    } else {
      var highCount = norm.filter(function (it) { return it.severity === 'high'; }).length;
      compliance = norm.length ? clamp(100 - round((highCount / norm.length) * 60), 0, 100) : 100;
    }

    var overall = round(accuracy * 0.35 + completeness * 0.25 + compliance * 0.2 + confidence * 0.2);

    return {
      accuracy: accuracy,
      completeness: completeness,
      compliance: compliance,
      confidence: confidence,
      overall: overall,
      band: bandFor(overall),
      openFindings: norm.length,
      recordCount: opts.recordCount != null ? opts.recordCount : null,
      reasons: norm.slice(0, 5).map(function (it) {
        return { claim: it.claim, severity: it.severity || 'med', confidence: it.confidence != null ? it.confidence : null };
      })
    };
  }

  /**
   * fromMdmScore(scoreDatasetResult)
   * scoreDatasetResult: the object returned by mdm-core.js's scoreDataset(),
   * i.e. { domain, avgScore, recordCount, scores: [{recordId, overall,
   * completeness, formatScore, issues}] }.
   */
  function fromMdmScore(scoreDatasetResult) {
    var r = scoreDatasetResult || {};
    var scores = Array.isArray(r.scores) ? r.scores : [];
    var completeness = scores.length
      ? round(scores.reduce(function (s, x) { return s + (x.completeness || 0); }, 0) / scores.length)
      : 100;
    var formatScore = scores.length
      ? round(scores.reduce(function (s, x) { return s + (x.formatScore || 0); }, 0) / scores.length)
      : 100;
    var totalIssues = scores.reduce(function (s, x) { return s + (Array.isArray(x.issues) ? x.issues.length : 0); }, 0);
    var compliance = scores.length ? clamp(100 - round((totalIssues / scores.length) * 15), 0, 100) : 100;
    var overall = typeof r.avgScore === 'number' ? r.avgScore : round(completeness * 0.6 + formatScore * 0.4);

    return {
      accuracy: formatScore,
      completeness: completeness,
      compliance: compliance,
      confidence: overall, // MDM has no separate model-confidence signal; overall doubles as it.
      overall: overall,
      band: bandFor(overall),
      openFindings: totalIssues,
      recordCount: r.recordCount != null ? r.recordCount : scores.length,
      reasons: scores
        .filter(function (x) { return Array.isArray(x.issues) && x.issues.length; })
        .slice(0, 5)
        .map(function (x) { return { claim: 'Record ' + x.recordId + ': ' + x.issues[0], severity: x.overall < 60 ? 'high' : 'med', confidence: x.overall }; })
    };
  }

  /** Blend multiple already-scored results (e.g. one per vertical) into a single platform-level rollup. */
  function rollup(scored) {
    var list = Array.isArray(scored) ? scored.filter(Boolean) : [];
    if (!list.length) return { overall: 100, band: bandFor(100), count: 0 };
    var avg = function (key) { return round(list.reduce(function (s, x) { return s + (x[key] || 0); }, 0) / list.length); };
    var overall = avg('overall');
    return {
      accuracy: avg('accuracy'),
      completeness: avg('completeness'),
      compliance: avg('compliance'),
      confidence: avg('confidence'),
      overall: overall,
      band: bandFor(overall),
      count: list.length
    };
  }

  var TSMQualityScoreEngine = {
    fromExplainItems: fromExplainItems,
    fromMdmScore: fromMdmScore,
    rollup: rollup,
    bandFor: bandFor
  };

  global.TSMQualityScoreEngine = TSMQualityScoreEngine;
  if (typeof module !== 'undefined' && module.exports) module.exports = TSMQualityScoreEngine;

})(typeof window !== 'undefined' ? window : this);

// ── Self-test (run directly with `node tsm-quality-score-engine.js`) ──────
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var Engine = module.exports;

  var sampleExplainItems = [
    { id: 'case-1', claim: 'CASE-104 is 30h past its "Escalated" SLA', confidence: 95, severity: 'high', rationale: 'Owner unassigned.', dataPoints: [{ label: 'Hours over SLA', value: '30h' }] },
    { id: 'case-2', claim: 'OPP-88 stalled 12h in "Negotiation"', confidence: 80, severity: 'med', rationale: 'No follow-up logged.', dataPoints: [{ label: 'Stage', value: 'Negotiation' }] },
    { id: 'case-3', claim: 'Minor formatting mismatch on renewal date', confidence: 60, severity: 'low' }
  ];
  console.log('[fromExplainItems]', JSON.stringify(Engine.fromExplainItems(sampleExplainItems, { recordCount: 42 }), null, 2));

  var sampleMdmScore = {
    domain: 'vendor', avgScore: 82, recordCount: 3,
    scores: [
      { recordId: 'V-1', overall: 95, completeness: 100, formatScore: 90, issues: [] },
      { recordId: 'V-2', overall: 70, completeness: 75, formatScore: 65, issues: ['Missing required field: taxId'] },
      { recordId: 'V-3', overall: 80, completeness: 88, formatScore: 72, issues: ['Invalid format: address'] }
    ]
  };
  console.log('[fromMdmScore]', JSON.stringify(Engine.fromMdmScore(sampleMdmScore), null, 2));

  console.log('[rollup]', JSON.stringify(Engine.rollup([Engine.fromExplainItems(sampleExplainItems), Engine.fromMdmScore(sampleMdmScore)]), null, 2));
}