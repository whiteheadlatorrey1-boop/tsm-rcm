/**
 * TSM Delivery Package Builder v1.0
 * --------------------------------------------------------------------------
 * BPO Enterprise Roadmap #9 — "Client Trust Package": bundle the processed
 * work, the quality report, the exception report, the audit trail, and an
 * executive summary into one client-facing deliverable, instead of a client
 * having to piece those together from separate portals.
 *
 * This is deliberately a pure assembler, not a new data source -- same
 * spirit as tsm-benchmark-intelligence.js's compare(), which reshapes data
 * other engines already produced rather than computing anything new. It
 * takes whatever you already have on hand from:
 *   - TSMQualityScoreEngine.fromExplainItems()/fromMdmScore() (#2) -> opts.qualityScore
 *   - an exception queue's list of open/resolved items (#3)        -> opts.exceptions
 *   - TSMHitlGate.getLog() (#4)                                    -> opts.decisions
 *   - TSMProcessMining.analyze() (#5)                               -> opts.processMining
 *   - TSMBenchmarkIntelligence.compare()/allBenchmarks() (#8)       -> opts.benchmarks
 * None of these are required -- buildPackage() degrades gracefully and
 * marks a section "not available" rather than failing, since a client
 * package assembled mid-rollout (before every roadmap item is wired in
 * for a given domain) should still be usable.
 *
 * Works in both the browser and Node (same dual-environment pattern as the
 * rest of html/shared).
 * ========================================================================== */

(function (global) {
  'use strict';

  function isNum(n) { return typeof n === 'number' && !isNaN(n); }

  /** summarizeExceptions(exceptions) -- exceptions: array of { id, priority, status, title/claim }. */
  function summarizeExceptions(exceptions) {
    var list = Array.isArray(exceptions) ? exceptions : [];
    var open = list.filter(function (e) { return e.status !== 'RESOLVED'; });
    var resolved = list.filter(function (e) { return e.status === 'RESOLVED'; });
    var byPriority = { P1: 0, P2: 0, P3: 0 };
    open.forEach(function (e) { if (byPriority[e.priority] != null) byPriority[e.priority]++; });

    return {
      available: list.length > 0,
      total: list.length,
      open: open.length,
      resolved: resolved.length,
      openByPriority: byPriority,
      topOpen: open.slice(0, 5).map(function (e) {
        return { id: e.id, priority: e.priority || null, title: e.title || e.claim || e.message || 'Untitled exception' };
      })
    };
  }

  /** summarizeAuditTrail(decisions) -- decisions: array from TSMHitlGate.getLog(). */
  function summarizeAuditTrail(decisions) {
    var list = Array.isArray(decisions) ? decisions : [];
    var approved = list.filter(function (d) { return d.decision === 'APPROVED'; }).length;
    var rejected = list.filter(function (d) { return d.decision === 'REJECTED'; }).length;

    return {
      available: list.length > 0,
      totalDecisions: list.length,
      approved: approved,
      rejected: rejected,
      recent: list.slice(0, 5)
    };
  }

  /** summarizeProcessInsights(processMining) -- processMining: output of TSMProcessMining.analyze(). */
  function summarizeProcessInsights(processMining) {
    if (!processMining) return { available: false };
    return {
      available: true,
      caseCount: processMining.caseCount || 0,
      findingCount: processMining.findingCount || 0,
      topFindings: (processMining.findings || []).slice(0, 3)
    };
  }

  /**
   * buildExecutiveSummary(opts)
   * Deterministic, template-based narrative (no external model call, so a
   * package always builds even offline) covering the four angles the
   * roadmap doc calls out: What happened / Why it matters / What to do /
   * Who owns it. Callers who do have an LLM available can instead pass
   * opts.summaryOverride to substitute a generated narrative here without
   * touching the rest of the package shape.
   */
  function buildExecutiveSummary(ctx, opts) {
    if (opts.summaryOverride) return opts.summaryOverride;

    var lines = [];

    // What happened
    if (ctx.qualityScore) {
      lines.push('What happened: ' + (ctx.domain || 'This workstream') + ' scored ' +
        ctx.qualityScore.overall + '/100 overall (' + ctx.qualityScore.band + '), across ' +
        (ctx.qualityScore.recordCount != null ? ctx.qualityScore.recordCount + ' records' : 'the reviewed period') + '.');
    } else {
      lines.push('What happened: Quality scoring not available for this package.');
    }

    // Why it matters
    if (ctx.exceptions.available) {
      lines.push('Why it matters: ' + ctx.exceptions.open + ' of ' + ctx.exceptions.total +
        ' flagged exceptions remain open (' + ctx.exceptions.openByPriority.P1 + ' P1, ' +
        ctx.exceptions.openByPriority.P2 + ' P2, ' + ctx.exceptions.openByPriority.P3 + ' P3).');
    } else {
      lines.push('Why it matters: No exception data supplied for this package.');
    }

    // What to do
    if (ctx.exceptions.topOpen.length) {
      lines.push('What to do: Prioritize ' + ctx.exceptions.topOpen[0].title +
        (ctx.exceptions.topOpen.length > 1 ? ', plus ' + (ctx.exceptions.topOpen.length - 1) + ' other open item(s).' : '.'));
    } else {
      lines.push('What to do: No open action items at time of packaging.');
    }

    // Who owns it
    if (ctx.auditTrail.available) {
      lines.push('Who owns it: ' + ctx.auditTrail.totalDecisions + ' decision(s) on record (' +
        ctx.auditTrail.approved + ' approved, ' + ctx.auditTrail.rejected + ' rejected) -- see audit trail for named actors.');
    } else {
      lines.push('Who owns it: No decision/audit trail supplied for this package.');
    }

    return lines.join(' ');
  }

  /**
   * buildPackage(opts)
   * opts.domain, opts.generatedFor (client/org name), opts.qualityScore,
   * opts.exceptions, opts.decisions, opts.processMining, opts.benchmarks,
   * opts.summaryOverride (see buildExecutiveSummary).
   */
  function buildPackage(opts) {
    opts = opts || {};

    var exceptions = summarizeExceptions(opts.exceptions);
    var auditTrail = summarizeAuditTrail(opts.decisions);
    var processInsights = summarizeProcessInsights(opts.processMining);
    var qualityScore = opts.qualityScore || null;

    var ctx = { domain: opts.domain, qualityScore: qualityScore, exceptions: exceptions, auditTrail: auditTrail };
    var executiveSummary = buildExecutiveSummary(ctx, opts);

    // Trust score: simple, transparent blend -- quality overall (if present)
    // weighted against how much of the exception backlog is still open.
    // Not a black-box number: every input is already visible elsewhere in
    // the package, this just rolls them into one headline figure.
    var trustScore = null;
    if (qualityScore && isNum(qualityScore.overall)) {
      var openPenalty = exceptions.available && exceptions.total
        ? Math.round((exceptions.open / exceptions.total) * 15)
        : 0;
      trustScore = Math.max(0, Math.min(100, qualityScore.overall - openPenalty));
    }

    return {
      domain: opts.domain || null,
      generatedFor: opts.generatedFor || null,
      generatedAt: new Date().toISOString(),
      trustScore: trustScore,
      executiveSummary: executiveSummary,
      qualityReport: qualityScore || { available: false },
      exceptionReport: exceptions,
      auditTrail: auditTrail,
      processInsights: processInsights,
      benchmarks: opts.benchmarks || null
    };
  }

  /** toMarkdown(pkg) -- renders a buildPackage() result as a client-readable markdown doc. */
  function toMarkdown(pkg) {
    pkg = pkg || {};
    var lines = [];
    lines.push('# Delivery Summary' + (pkg.domain ? ' — ' + pkg.domain : ''));
    if (pkg.generatedFor) lines.push('Prepared for: ' + pkg.generatedFor);
    lines.push('Generated: ' + pkg.generatedAt);
    if (pkg.trustScore != null) lines.push('\n**Trust Score: ' + pkg.trustScore + '/100**');
    lines.push('\n## Executive Summary\n' + pkg.executiveSummary);

    lines.push('\n## Quality Report');
    lines.push(pkg.qualityReport && pkg.qualityReport.overall != null
      ? '- Overall: ' + pkg.qualityReport.overall + ' (' + pkg.qualityReport.band + ')\n' +
        '- Accuracy: ' + pkg.qualityReport.accuracy + ' | Completeness: ' + pkg.qualityReport.completeness +
        ' | Compliance: ' + pkg.qualityReport.compliance + ' | Confidence: ' + pkg.qualityReport.confidence
      : '- Not available for this package.');

    lines.push('\n## Exception Report');
    if (pkg.exceptionReport && pkg.exceptionReport.available) {
      lines.push('- Open: ' + pkg.exceptionReport.open + ' / ' + pkg.exceptionReport.total +
        ' (P1: ' + pkg.exceptionReport.openByPriority.P1 + ', P2: ' + pkg.exceptionReport.openByPriority.P2 +
        ', P3: ' + pkg.exceptionReport.openByPriority.P3 + ')');
      pkg.exceptionReport.topOpen.forEach(function (e) { lines.push('  - [' + (e.priority || '-') + '] ' + e.title); });
    } else {
      lines.push('- Not available for this package.');
    }

    lines.push('\n## Audit Trail');
    if (pkg.auditTrail && pkg.auditTrail.available) {
      lines.push('- ' + pkg.auditTrail.totalDecisions + ' decisions (' + pkg.auditTrail.approved + ' approved, ' + pkg.auditTrail.rejected + ' rejected)');
    } else {
      lines.push('- Not available for this package.');
    }

    return lines.join('\n');
  }

  var TSMDeliveryPackage = {
    buildPackage: buildPackage,
    toMarkdown: toMarkdown,
    summarizeExceptions: summarizeExceptions,
    summarizeAuditTrail: summarizeAuditTrail,
    summarizeProcessInsights: summarizeProcessInsights
  };

  global.TSMDeliveryPackage = TSMDeliveryPackage;
  if (typeof module !== 'undefined' && module.exports) module.exports = TSMDeliveryPackage;

})(typeof window !== 'undefined' ? window : this);

// ── Self-test (run directly with `node tsm-delivery-package.js`) ──────────
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var Pkg = module.exports;

  var pkg = Pkg.buildPackage({
    domain: 'HEALTHCARE',
    generatedFor: 'Acme Regional Health',
    qualityScore: { overall: 78, band: 'ACCEPTABLE', accuracy: 82, completeness: 90, compliance: 70, confidence: 75, recordCount: 120 },
    exceptions: [
      { id: 'e1', priority: 'P1', status: 'OPEN', title: 'CASE-104 30h past SLA' },
      { id: 'e2', priority: 'P2', status: 'OPEN', title: 'OPP-88 stalled in Negotiation' },
      { id: 'e3', priority: 'P3', status: 'RESOLVED', title: 'Minor formatting mismatch' }
    ],
    decisions: [
      { id: 'GOV-DEC-1', entityId: 'risk-1', decision: 'APPROVED', actor: 'Compliance Lead', ts: new Date().toISOString() }
    ]
  });

  console.log('[package JSON]', JSON.stringify(pkg, null, 2));
  console.log('\n[package markdown]\n' + Pkg.toMarkdown(pkg));

  var emptyPkg = Pkg.buildPackage({ domain: 'CONSTRUCTION', generatedFor: 'Test Client' });
  console.log('\n[empty-input package still builds]', JSON.stringify(emptyPkg, null, 2));
}