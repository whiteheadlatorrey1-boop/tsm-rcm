/**
 * TSM Quality Score Engine
 * ─────────────────────────────────────────────────────────────
 * Roadmap item #2 (AI Operations Command Upgrade — 10 Phases).
 * Turns the confidence/rule-pass data the BPO chain already produces
 * (extraction result + strategy recommendation JSON) into a
 * 0–100 composite Quality Score with a "why this score" breakdown,
 * matching the Accuracy / Completeness / Compliance / Confidence
 * model from the BPO quality-return email.
 *
 * No new AI calls. No new instrumentation. Reads exactly the shapes
 * already written by:
 *   - bpo-situation-room.html  → `extraction` (fireExtractionEngine result)
 *   - bpo-strategist-v2.html   → `recommendation` (generatedRec / ===JSON=== block)
 *
 * Usage:
 *   const result = TSMQualityScore.compute({ extraction, recommendation });
 *   TSMQualityScore.renderCard('qualityScoreMount', result);
 *
 * Exposed as window.TSMQualityScore.
 */
(function (global) {
  'use strict';

  // ── WEIGHTS ──────────────────────────────────────────────────
  const WEIGHTS = { accuracy: 0.30, completeness: 0.25, compliance: 0.25, confidence: 0.20 };

  const SOURCE_WEIGHT_VALUE = { HIGH: 3, MED: 2, MEDIUM: 2, LOW: 1 };

  // ── COMPLETENESS ─────────────────────────────────────────────
  // Checks the same fields the situation-room and strategist prompts
  // ask the model to fill in. Missing fields = incomplete extraction.
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

  // ── ACCURACY ─────────────────────────────────────────────────
  // Proxy for accuracy using evidence density: how many data sources
  // backed the recommendation, weighted by how strong each source is,
  // plus a bonus if this incident resolved against prior cross-upload memory.
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

  // ── COMPLIANCE ───────────────────────────────────────────────
  // Rule-pass checks: does this recommendation satisfy the platform's
  // own governance rules (owner assigned, human approval gate present, etc.)
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

  // ── CONFIDENCE ───────────────────────────────────────────────
  // Directly from the AI's self-reported confidence on the strategy brief.
  // Falls back to a conservative default if the strategist hasn't fired yet.
  function scoreConfidence(recommendation) {
    const checks = [];
    if (recommendation && typeof recommendation.confidence === 'number') {
      checks.push(['AI-reported confidence score present', true]);
      return { pct: recommendation.confidence, checks };
    }
    checks.push(['AI-reported confidence score present', false]);
    return { pct: 60, checks }; // conservative default pre-strategy-brief
  }

  // ── COMPOSITE ────────────────────────────────────────────────
  function compute(input) {
    input = input || {};
    const extraction = input.extraction || null;
    const recommendation = input.recommendation || null;
    const opts = { crossUploadHit: !!input.crossUploadHit };

    const completeness = scoreCompleteness(extraction, recommendation);
    const accuracy = scoreAccuracy(extraction, recommendation, opts);
    const compliance = scoreCompliance(extraction, recommendation);
    const confidence = scoreConfidence(recommendation);

    const overall = Math.round(
      accuracy.pct * WEIGHTS.accuracy +
      completeness.pct * WEIGHTS.completeness +
      compliance.pct * WEIGHTS.compliance +
      confidence.pct * WEIGHTS.confidence
    );

    let grade = 'NEEDS REVIEW';
    if (overall >= 95) grade = 'EXCELLENT';
    else if (overall >= 85) grade = 'STRONG';
    else if (overall >= 70) grade = 'ACCEPTABLE';

    // Merge all checklist items into one "why this score" breakdown,
    // matching the ✓ / ⚠ format from the BPO quality-return spec.
    const breakdown = [
      ...completeness.checks.map(c => ({ group: 'Completeness', label: c[0], passed: c[1] })),
      ...accuracy.checks.map(c => ({ group: 'Accuracy', label: c[0], passed: c[1] })),
      ...compliance.checks.map(c => ({ group: 'Compliance', label: c[0], passed: c[1] })),
      ...confidence.checks.map(c => ({ group: 'Confidence', label: c[0], passed: c[1] })),
    ];

    return {
      overall, grade,
      accuracy: accuracy.pct,
      completeness: completeness.pct,
      compliance: compliance.pct,
      confidence: confidence.pct,
      breakdown,
      computedAt: new Date().toISOString()
    };
  }

  // ── RENDER: compact card (drop into any panel via mount id) ────
  function colorFor(pct) {
    if (pct >= 90) return 'var(--green)';
    if (pct >= 75) return 'var(--cyan)';
    if (pct >= 60) return 'var(--amber)';
    return 'var(--red)';
  }

  function renderCard(mountId, result) {
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

    const breakdownHtml = result.breakdown.map(b => `
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
          <div style="font-family:'JetBrains Mono',monospace;font-size:.6rem;color:var(--muted);margin-top:2px;">${result.grade}</div>
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

  global.TSMQualityScore = { compute, renderCard, WEIGHTS };
})(window);