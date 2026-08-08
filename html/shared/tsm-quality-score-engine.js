/**
 * TSM Quality Score Engine (merged)
 * ─────────────────────────────────────────────────────────────
 * This file sits at a path THREE different callers expect to load from
 * the same location — and each caller wants a different API on it:
 *
 *   1. server.js (Node, via require())
 *        TSMQualityScoreEngine.fromMdmScore(scored)   → per-domain score
 *        TSMQualityScoreEngine.rollup(perDomainArray)  → platform-wide score
 *      scored = mdm-core.js's scoreDataset() output: { avgScore, recordCount, scores: [{recordId, overall, issues}] }
 *
 *   2. mdm-executive-portal.html (browser, via <script src>)
 *        TSMQualityScoreEngine.fromExplainItems(items, { recordCount })
 *      items = the tsm-exec-framework.js "explain" contract array:
 *        { id, claim, confidence, severity, impact, rationale, sources, dataPoints }
 *
 *   3. bpo-situation-room.html / bpo-strategist-v2.html (browser, per the
 *      original tsm-quality-score-engine.js header comment)
 *        TSMQualityScore.compute({ extraction, recommendation })
 *        TSMQualityScore.renderCard(mountId, result)
 *
 * A prior version of this file only implemented #3, exposed only as
 * window.TSMQualityScore, and used `})(window)` with no module.exports —
 * which crashes immediately if server.js requires it (ReferenceError:
 * window is not defined) and doesn't have fromMdmScore/rollup/fromExplainItems
 * at all. This merged version is isomorphic (works under require() AND
 * <script src>) and implements all three APIs so nothing that depends on
 * this path breaks.
 *
 * IMPORTANT — honesty note on fromMdmScore/rollup/fromExplainItems:
 * These three functions did not exist anywhere I was given to reverse-engineer
 * from. mdm-core.js's scoreDataset() only exposes {avgScore, recordCount,
 * scores:[{recordId, overall, issues}]} — no accuracy/completeness/compliance/
 * confidence breakdown. So the four-way split below is MY best-effort proxy
 * built from what's actually in that shape, not a recovered original:
 *   - accuracy      = avgScore itself (the dataset's own per-record validation score)
 *   - completeness  = % of records with zero flagged issues
 *   - compliance    = % of records at/above a minimum quality bar (overall >= 70)
 *   - confidence    = 100 minus a penalty for how spread out the scores are
 *                     (tight cluster of scores = higher confidence in the average;
 *                     wide spread = lower confidence)
 * If the real repo has different intended semantics for these, treat this as
 * a placeholder to replace, not ground truth.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TSMQualityScoreEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ── Shared weights + banding (same model for all three APIs) ───────────
  const WEIGHTS = { accuracy: 0.30, completeness: 0.25, compliance: 0.25, confidence: 0.20 };
  const SOURCE_WEIGHT_VALUE = { HIGH: 3, MED: 2, MEDIUM: 2, LOW: 1 };

  function bandFor(overall) {
    if (overall >= 95) return 'EXCELLENT';
    if (overall >= 85) return 'STRONG';
    if (overall >= 70) return 'ACCEPTABLE';
    return 'NEEDS REVIEW';
  }

  function composite(accuracy, completeness, compliance, confidence) {
    return Math.round(
      accuracy * WEIGHTS.accuracy +
      completeness * WEIGHTS.completeness +
      compliance * WEIGHTS.compliance +
      confidence * WEIGHTS.confidence
    );
  }

  function clamp(n) { return Math.max(0, Math.min(100, Math.round(n))); }

  // ── API #1: server-side, mdm-core.js scoreDataset() output ─────────────
  function fromMdmScore(scored) {
    scored = scored || {};
    const scores = Array.isArray(scored.scores) ? scored.scores : [];
    const recordCount = scored.recordCount != null ? scored.recordCount : scores.length;

    const accuracy = clamp(scored.avgScore != null ? scored.avgScore : 0);

    const cleanCount = scores.filter(s => !s.issues || s.issues.length === 0).length;
    const completeness = scores.length ? clamp((cleanCount / scores.length) * 100) : 0;

    const passingCount = scores.filter(s => (s.overall != null ? s.overall : 0) >= 70).length;
    const compliance = scores.length ? clamp((passingCount / scores.length) * 100) : 0;

    let confidence = 100;
    if (scores.length > 1) {
      const vals = scores.map(s => s.overall != null ? s.overall : 0);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
      const stdDev = Math.sqrt(variance);
      confidence = clamp(100 - stdDev); // tighter spread => higher confidence
    }

    const overall = composite(accuracy, completeness, compliance, confidence);
    return {
      overall, band: bandFor(overall),
      accuracy, completeness, compliance, confidence,
      recordCount,
      computedAt: new Date().toISOString()
    };
  }

  // ── rollup: weighted average across per-domain fromMdmScore() results ──
  function rollup(perDomain) {
    perDomain = Array.isArray(perDomain) ? perDomain : [];
    if (!perDomain.length) {
      return { overall: 0, band: bandFor(0), accuracy: 0, completeness: 0, compliance: 0, confidence: 0 };
    }
    const totalWeight = perDomain.reduce((s, d) => s + (d.recordCount || 1), 0) || 1;
    const wavg = key => clamp(
      perDomain.reduce((s, d) => s + (d[key] || 0) * (d.recordCount || 1), 0) / totalWeight
    );
    const accuracy = wavg('accuracy');
    const completeness = wavg('completeness');
    const compliance = wavg('compliance');
    const confidence = wavg('confidence');
    const overall = composite(accuracy, completeness, compliance, confidence);
    return { overall, band: bandFor(overall), accuracy, completeness, compliance, confidence };
  }

  // ── API #2: browser-side, tsm-exec-framework.js "explain" item contract ─
  function fromExplainItems(items, opts) {
    opts = opts || {};
    items = Array.isArray(items) ? items : [];
    const recordCount = opts.recordCount != null ? opts.recordCount : items.length;

    if (!items.length) {
      return { overall: 0, band: bandFor(0), accuracy: 0, completeness: 0, compliance: 0, confidence: 0, recordCount };
    }

    const withSources = items.filter(it => Array.isArray(it.sources) && it.sources.length > 0).length;
    const accuracy = clamp((withSources / items.length) * 100);

    const fullyDocumented = items.filter(it =>
      !!it.rationale && Array.isArray(it.dataPoints) && it.dataPoints.length > 0
    ).length;
    const completeness = clamp((fullyDocumented / items.length) * 100);

    const withSeverity = items.filter(it => !!it.severity).length;
    const compliance = clamp((withSeverity / items.length) * 100);

    const confVals = items.filter(it => typeof it.confidence === 'number').map(it => it.confidence);
    const confidence = confVals.length
      ? clamp(confVals.reduce((a, b) => a + b, 0) / confVals.length)
      : 60; // conservative default when nothing self-reports confidence

    const overall = composite(accuracy, completeness, compliance, confidence);
    return {
      overall, band: bandFor(overall),
      accuracy, completeness, compliance, confidence,
      recordCount,
      computedAt: new Date().toISOString()
    };
  }

  // ── API #3: original BPO situation-room / strategist engine ────────────
  // Unchanged in behavior from the prior tsm-quality-score-engine.js, just
  // made isomorphic and folded into this merged module.

  function scoreCompleteness(extraction, recommendation) {
    const checks = [];
    const ext = extraction || {};
    checks.push(['Root cause identified', !!ext.rootCause]);
    checks.push(['Revenue/exposure amount extracted', !!ext.revenueAtRisk]);
    checks.push(['Runway / time-to-critical extracted', !!ext.runway]);
    checks.push(['Severity classified', !!ext.severity]);
    checks.push(['Situation summary generated', !!ext.situationSummary]);
    checks.push(['Risk cascade populated', Array.isArray(ext.risks) && ext.risks.length > 0]);
    checks.push(['BNCA next-actions populated', Array.isArray(ext.bnca) && ext.bnca.length > 0]);
    if (recommendation) {
      const rec = recommendation;
      checks.push(['Recommended actions generated', Array.isArray(rec.recommendedActions) && rec.recommendedActions.length > 0]);
      checks.push(['Escalation triggers defined', Array.isArray(rec.escalationTriggers) && rec.escalationTriggers.length > 0]);
      checks.push(['No-action vs. action revenue delta modeled', !!(rec.noActionRevLoss && rec.actionRevLoss)]);
      checks.push(['Recovery time estimated', !!rec.recoveryTime]);
    }
    const passed = checks.filter(c => c[1]).length;
    const pct = checks.length ? Math.round((passed / checks.length) * 100) : 0;
    return { pct, checks };
  }

  function scoreAccuracy(extraction, recommendation, opts) {
    const checks = [];
    let raw = 0, max = 0;
    const sources = (recommendation && recommendation.dataSources) || [];
    if (sources.length) {
      sources.forEach(s => {
        const w = SOURCE_WEIGHT_VALUE[(s.weight || '').toUpperCase()] || 1;
        raw += w; max += 3;
      });
      checks.push([`${sources.length} data source(s) cited behind the recommendation`, true]);
    } else {
      checks.push(['Data sources cited behind the recommendation', false]);
      max += 3;
    }
    const reasoning = (recommendation && recommendation.reasoning) || [];
    checks.push(['Reasoning chain documented (not a black-box output)', reasoning.length > 0]);
    raw += reasoning.length > 0 ? 3 : 0; max += 3;
    const anomalyResolved = !!(opts && opts.crossUploadHit);
    checks.push(['Matched against prior cross-upload memory', anomalyResolved]);
    raw += anomalyResolved ? 3 : 0; max += 3;
    const risks = (extraction && extraction.risks) || [];
    const risksHaveLevels = risks.length > 0 && risks.every(r => !!r.level);
    checks.push(['Every extracted risk carries a severity level', risksHaveLevels]);
    raw += risksHaveLevels ? 3 : 0; max += 3;
    const pct = max ? Math.round((raw / max) * 100) : 0;
    return { pct, checks };
  }

  function scoreCompliance(extraction, recommendation) {
    const checks = [];
    let passed = 0, total = 0;
    const actions = (recommendation && recommendation.recommendedActions) || [];
    total++;
    const allOwned = actions.length > 0 && actions.every(a => !!a.owner);
    checks.push(['Every recommended action has a named owner', allOwned]);
    if (allOwned) passed++;
    total++;
    const hasTriggers = !!(recommendation && recommendation.escalationTriggers && recommendation.escalationTriggers.length);
    checks.push(['Escalation thresholds defined (not open-ended)', hasTriggers]);
    if (hasTriggers) passed++;
    total++;
    const hasSeverity = !!(extraction && extraction.severity);
    checks.push(['Severity classification present for triage routing', hasSeverity]);
    if (hasSeverity) passed++;
    total++;
    const hitlReady = !!(recommendation && Array.isArray(recommendation.recommendedActions) && recommendation.recommendedActions.length);
    checks.push(['Recommendation routed to human approval before execution (HITL gate)', hitlReady]);
    if (hitlReady) passed++;
    const pct = total ? Math.round((passed / total) * 100) : 0;
    return { pct, checks };
  }

  function scoreConfidence(recommendation) {
    const checks = [];
    if (recommendation && typeof recommendation.confidence === 'number') {
      checks.push(['AI-reported confidence score present', true]);
      return { pct: recommendation.confidence, checks };
    }
    checks.push(['AI-reported confidence score present', false]);
    return { pct: 60, checks };
  }

  function compute(input) {
    input = input || {};
    const extraction = input.extraction || null;
    const recommendation = input.recommendation || null;
    const opts = { crossUploadHit: !!input.crossUploadHit };

    const completeness = scoreCompleteness(extraction, recommendation);
    const accuracy = scoreAccuracy(extraction, recommendation, opts);
    const compliance = scoreCompliance(extraction, recommendation);
    const confidence = scoreConfidence(recommendation);

    const overall = composite(accuracy.pct, completeness.pct, compliance.pct, confidence.pct);
    const grade = bandFor(overall);

    const breakdown = [
      ...completeness.checks.map(c => ({ group: 'Completeness', label: c[0], passed: c[1] })),
      ...accuracy.checks.map(c => ({ group: 'Accuracy', label: c[0], passed: c[1] })),
      ...compliance.checks.map(c => ({ group: 'Compliance', label: c[0], passed: c[1] })),
      ...confidence.checks.map(c => ({ group: 'Confidence', label: c[0], passed: c[1] })),
    ];

    return {
      overall, grade,
      accuracy: accuracy.pct, completeness: completeness.pct,
      compliance: compliance.pct, confidence: confidence.pct,
      breakdown, computedAt: new Date().toISOString()
    };
  }

  function colorFor(pct) {
    if (pct >= 90) return 'var(--green)';
    if (pct >= 75) return 'var(--cyan)';
    if (pct >= 60) return 'var(--amber)';
    return 'var(--red)';
  }

  function renderCard(mountId, result) {
    if (typeof document === 'undefined') return; // no-op under Node
    const el = typeof mountId === 'string' ? document.getElementById(mountId) : mountId;
    if (!el || !result) return;

    const metricRow = (label, pct) => `
      <div style="flex:1;min-width:110px;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:.62rem;color:var(--muted);letter-spacing:.08em;margin-bottom:4px;">${label.toUpperCase()}</div>
        <div style="font-family:'Orbitron',sans-serif;font-size:1.1rem;color:${colorFor(pct)};">${pct}%</div>
        <div style="height:3px;background:rgba(255,255,255,.08);border-radius:2px;margin-top:4px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${colorFor(pct)};"></div>
        </div>
      </div>`;

    const breakdownHtml = (result.breakdown || []).map(b => `
      <div style="display:flex;align-items:flex-start;gap:8px;padding:4px 0;font-family:'JetBrains Mono',monospace;font-size:.68rem;color:${b.passed ? 'var(--text)' : 'var(--muted)'};">
        <span style="color:${b.passed ? 'var(--green)' : 'var(--amber)'};flex-shrink:0;">${b.passed ? '✓' : '⚠'}</span>
        <span><span style="color:var(--muted);">[${b.group}]</span> ${b.label}</span>
      </div>`).join('');

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <div style="font-family:'Orbitron',sans-serif;font-size:.62rem;letter-spacing:.1em;color:var(--purple);display:flex;align-items:center;gap:8px;">
          <div style="width:7px;height:7px;border-radius:50%;background:var(--purple);"></div>TSM QUALITY SCORE
        </div>
        <div style="text-align:right;">
          <div style="font-family:'Orbitron',sans-serif;font-size:1.4rem;color:${colorFor(result.overall)};line-height:1;">${result.overall}%</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:.6rem;color:var(--muted);margin-top:2px;">${result.grade || result.band}</div>
        </div>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:14px;">
        ${metricRow('Accuracy', result.accuracy)}
        ${metricRow('Completeness', result.completeness)}
        ${metricRow('Compliance', result.compliance)}
        ${metricRow('Confidence', result.confidence)}
      </div>
      <div style="border-top:1px solid var(--border);padding-top:10px;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:.6rem;color:var(--muted);letter-spacing:.08em;margin-bottom:6px;">WHY THIS SCORE</div>
        ${breakdownHtml}
      </div>
    `;
  }

  const api = {
    // MDM / server-side
    fromMdmScore, rollup,
    // MDM portal / explain-contract
    fromExplainItems,
    // BPO situation room / strategist
    compute, renderCard,
    WEIGHTS
  };

  // Back-compat alias: BPO pages call window.TSMQualityScore.compute(...)
  if (typeof self !== 'undefined') { self.TSMQualityScore = api; }
  else if (typeof window !== 'undefined') { window.TSMQualityScore = api; }

  return api;
}));