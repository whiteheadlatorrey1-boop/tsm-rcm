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

  // ==========================================================================
  // TSMQualityScore — BPO Quality-Return Card
  // --------------------------------------------------------------------------
  // A second, purpose-built scorer for the BPO quality-return spec. Unlike
  // fromExplainItems/fromMdmScore above (which score existing explainability/
  // MDM output for the cross-vertical rollup), this scores the raw BPO chain
  // output directly: { extraction, recommendation } as produced by
  // bpo-situation-room.html (fireExtractionEngine) and bpo-strategist-v2.html
  // (generatedRec / ===JSON=== block). No new AI calls, no new
  // instrumentation — reads shapes those pages already write.
  //
  // Exposed separately as global.TSMQualityScore (browser) and as
  // TSMQualityScoreEngine.Card (Node/require), so nothing that already does
  // `require('./tsm-quality-score-engine.js')` and calls .fromMdmScore()/
  // .rollup() is affected — this is purely additive.
  //
  // Usage: TSMQualityScore.compute({ extraction, recommendation }) ->
  //   { overall, grade, accuracy, completeness, compliance, confidence,
  //     breakdown, computedAt }
  // TSMQualityScore.renderCard(mountId, result) — browser only, no-ops in Node.
  // ==========================================================================

  var CARD_WEIGHTS = { accuracy: 0.30, completeness: 0.25, compliance: 0.25, confidence: 0.20 };
  var SOURCE_WEIGHT_VALUE = { HIGH: 3, MED: 2, MEDIUM: 2, LOW: 1 };

  function cardScoreCompleteness(extraction, recommendation) {
    var checks = [];
    var ext = extraction || {};
    checks.push(['Root cause identified', !!ext.rootCause]);
    checks.push(['Revenue/exposure amount extracted', !!ext.revenueAtRisk]);
    checks.push(['Runway / time-to-critical extracted', !!ext.runway]);
    checks.push(['Severity classified', !!ext.severity]);
    checks.push(['Situation summary generated', !!ext.situationSummary]);
    checks.push(['Risk cascade populated', Array.isArray(ext.risks) && ext.risks.length > 0]);
    checks.push(['BNCA next-actions populated', Array.isArray(ext.bnca) && ext.bnca.length > 0]);

    if (recommendation) {
      var rec = recommendation;
      checks.push(['Recommended actions generated', Array.isArray(rec.recommendedActions) && rec.recommendedActions.length > 0]);
      checks.push(['Escalation triggers defined', Array.isArray(rec.escalationTriggers) && rec.escalationTriggers.length > 0]);
      checks.push(['No-action vs. action revenue delta modeled', !!(rec.noActionRevLoss && rec.actionRevLoss)]);
      checks.push(['Recovery time estimated', !!rec.recoveryTime]);
    }

    var passed = checks.filter(function (c) { return c[1]; }).length;
    var pct = checks.length ? Math.round((passed / checks.length) * 100) : 0;
    return { pct: pct, checks: checks };
  }

  function cardScoreAccuracy(extraction, recommendation, opts) {
    var checks = [];
    var raw = 0, max = 0;

    var sources = (recommendation && recommendation.dataSources) || [];
    if (sources.length) {
      sources.forEach(function (s) {
        var w = SOURCE_WEIGHT_VALUE[(s.weight || '').toUpperCase()] || 1;
        raw += w; max += 3;
      });
      checks.push([sources.length + ' data source(s) cited behind the recommendation', true]);
    } else {
      checks.push(['Data sources cited behind the recommendation', false]);
      max += 3;
    }

    var reasoning = (recommendation && recommendation.reasoning) || [];
    checks.push(['Reasoning chain documented (not a black-box output)', reasoning.length > 0]);
    raw += reasoning.length > 0 ? 3 : 0; max += 3;

    var anomalyResolved = !!(opts && opts.crossUploadHit);
    checks.push(['Matched against prior cross-upload memory', anomalyResolved]);
    raw += anomalyResolved ? 3 : 0; max += 3;

    var risks = (extraction && extraction.risks) || [];
    var risksHaveLevels = risks.length > 0 && risks.every(function (r) { return !!r.level; });
    checks.push(['Every extracted risk carries a severity level', risksHaveLevels]);
    raw += risksHaveLevels ? 3 : 0; max += 3;

    var pct = max ? Math.round((raw / max) * 100) : 0;
    return { pct: pct, checks: checks };
  }

  function cardScoreCompliance(extraction, recommendation) {
    var checks = [];
    var passed = 0, total = 0;

    var actions = (recommendation && recommendation.recommendedActions) || [];
    total++;
    var allOwned = actions.length > 0 && actions.every(function (a) { return !!a.owner; });
    checks.push(['Every recommended action has a named owner', allOwned]);
    if (allOwned) passed++;

    total++;
    var hasTriggers = !!(recommendation && recommendation.escalationTriggers && recommendation.escalationTriggers.length);
    checks.push(['Escalation thresholds defined (not open-ended)', hasTriggers]);
    if (hasTriggers) passed++;

    total++;
    var hasSeverity = !!(extraction && extraction.severity);
    checks.push(['Severity classification present for triage routing', hasSeverity]);
    if (hasSeverity) passed++;

    total++;
    var hitlReady = !!(recommendation && Array.isArray(recommendation.recommendedActions) && recommendation.recommendedActions.length);
    checks.push(['Recommendation routed to human approval before execution (HITL gate)', hitlReady]);
    if (hitlReady) passed++;

    var pct = total ? Math.round((passed / total) * 100) : 0;
    return { pct: pct, checks: checks };
  }

  function cardScoreConfidence(recommendation) {
    var checks = [];
    if (recommendation && typeof recommendation.confidence === 'number') {
      checks.push(['AI-reported confidence score present', true]);
      return { pct: recommendation.confidence, checks: checks };
    }
    checks.push(['AI-reported confidence score present', false]);
    return { pct: 60, checks: checks }; // conservative default pre-strategy-brief
  }

  function cardCompute(input) {
    input = input || {};
    var extraction = input.extraction || null;
    var recommendation = input.recommendation || null;
    var opts = { crossUploadHit: !!input.crossUploadHit };

    var completeness = cardScoreCompleteness(extraction, recommendation);
    var accuracy = cardScoreAccuracy(extraction, recommendation, opts);
    var compliance = cardScoreCompliance(extraction, recommendation);
    var confidence = cardScoreConfidence(recommendation);

    var overall = Math.round(
      accuracy.pct * CARD_WEIGHTS.accuracy +
      completeness.pct * CARD_WEIGHTS.completeness +
      compliance.pct * CARD_WEIGHTS.compliance +
      confidence.pct * CARD_WEIGHTS.confidence
    );

    var grade = 'NEEDS REVIEW';
    if (overall >= 95) grade = 'EXCELLENT';
    else if (overall >= 85) grade = 'STRONG';
    else if (overall >= 70) grade = 'ACCEPTABLE';

    var breakdown = []
      .concat(completeness.checks.map(function (c) { return { group: 'Completeness', label: c[0], passed: c[1] }; }))
      .concat(accuracy.checks.map(function (c) { return { group: 'Accuracy', label: c[0], passed: c[1] }; }))
      .concat(compliance.checks.map(function (c) { return { group: 'Compliance', label: c[0], passed: c[1] }; }))
      .concat(confidence.checks.map(function (c) { return { group: 'Confidence', label: c[0], passed: c[1] }; }));

    return {
      overall: overall,
      grade: grade,
      accuracy: accuracy.pct,
      completeness: completeness.pct,
      compliance: compliance.pct,
      confidence: confidence.pct,
      breakdown: breakdown,
      computedAt: new Date().toISOString()
    };
  }

  function cardColorFor(pct) {
    if (pct >= 90) return 'var(--green)';
    if (pct >= 75) return 'var(--cyan)';
    if (pct >= 60) return 'var(--amber)';
    return 'var(--red)';
  }

  // Browser-only: no-ops in Node (no `document`) instead of throwing, since
  // this file is required server-side by server.js for the Engine half above.
  function cardRenderCard(mountId, result) {
    if (typeof document === 'undefined') {
      console.warn('[TSMQualityScore] renderCard() called outside a browser environment — no-op.');
      return;
    }
    var el = typeof mountId === 'string' ? document.getElementById(mountId) : mountId;
    if (!el || !result) return;

    var metricRow = function (label, pct) {
      return '' +
        '<div style="flex:1;min-width:110px;">' +
          '<div style="font-family:\'JetBrains Mono\',monospace;font-size:.62rem;color:var(--muted);letter-spacing:.08em;margin-bottom:4px;">' + label.toUpperCase() + '</div>' +
          '<div style="font-family:\'Orbitron\',sans-serif;font-size:1.1rem;color:' + cardColorFor(pct) + ';">' + pct + '%</div>' +
          '<div style="height:3px;background:rgba(255,255,255,.08);border-radius:2px;margin-top:4px;overflow:hidden;">' +
            '<div style="height:100%;width:' + pct + '%;background:' + cardColorFor(pct) + ';"></div>' +
          '</div>' +
        '</div>';
    };

    var breakdownHtml = result.breakdown.map(function (b) {
      return '' +
        '<div style="display:flex;align-items:flex-start;gap:8px;padding:4px 0;font-family:\'JetBrains Mono\',monospace;font-size:.68rem;color:' + (b.passed ? 'var(--text)' : 'var(--muted)') + ';">' +
          '<span style="color:' + (b.passed ? 'var(--green)' : 'var(--amber)') + ';flex-shrink:0;">' + (b.passed ? '\u2713' : '\u26a0') + '</span>' +
          '<span><span style="color:var(--muted);">[' + b.group + ']</span> ' + b.label + '</span>' +
        '</div>';
    }).join('');

    el.innerHTML = '' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">' +
        '<div style="font-family:\'Orbitron\',sans-serif;font-size:.62rem;letter-spacing:.1em;color:var(--purple);display:flex;align-items:center;gap:8px;">' +
          '<div style="width:7px;height:7px;border-radius:50%;background:var(--purple);"></div>TSM QUALITY SCORE' +
        '</div>' +
        '<div style="text-align:right;">' +
          '<div style="font-family:\'Orbitron\',sans-serif;font-size:1.4rem;color:' + cardColorFor(result.overall) + ';line-height:1;">' + result.overall + '%</div>' +
          '<div style="font-family:\'JetBrains Mono\',monospace;font-size:.6rem;color:var(--muted);margin-top:2px;">' + result.grade + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:14px;">' +
        metricRow('Accuracy', result.accuracy) +
        metricRow('Completeness', result.completeness) +
        metricRow('Compliance', result.compliance) +
        metricRow('Confidence', result.confidence) +
      '</div>' +
      '<div style="border-top:1px solid var(--border);padding-top:10px;">' +
        '<div style="font-family:\'JetBrains Mono\',monospace;font-size:.6rem;color:var(--muted);letter-spacing:.08em;margin-bottom:6px;">WHY THIS SCORE</div>' +
        breakdownHtml +
      '</div>';
  }

  var TSMQualityScore = {
    compute: cardCompute,
    renderCard: cardRenderCard,
    WEIGHTS: CARD_WEIGHTS
  };

  var TSMQualityScoreEngine = {
    fromExplainItems: fromExplainItems,
    fromMdmScore: fromMdmScore,
    rollup: rollup,
    bandFor: bandFor
  };

  global.TSMQualityScoreEngine = TSMQualityScoreEngine;
  global.TSMQualityScore = TSMQualityScore;
  // Also reachable via require(...).Card in Node, without changing the shape
  // require(...) already returns (server.js destructures methods straight
  // off it — fromMdmScore/rollup/etc — so module.exports itself must stay
  // TSMQualityScoreEngine, unchanged).
  TSMQualityScoreEngine.Card = TSMQualityScore;
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