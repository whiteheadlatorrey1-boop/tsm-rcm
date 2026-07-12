/**
 * TSM Delivery Package v1.0
 * --------------------------------------------------------------------------
 * BPO Enterprise Roadmap #9 — "Client Trust Package": every completed batch
 * should generate one bundle covering processed documents, structured data,
 * quality report, exception report, risk report, audit trail, recommended
 * actions, and an executive summary.
 *
 * Like #7, this is a pure assembly layer — every section is read from an
 * engine this platform already has, nothing here computes a new number:
 *
 *   Processed Documents   <- opts.documentCount (caller-supplied; this
 *                            platform doesn't have a single canonical
 *                            "documents processed" counter yet, so it's
 *                            passed in rather than guessed)
 *   Structured Data       <- opts.explainItems, as-is (already the shared
 *                            contract every vertical produces)
 *   Quality Report        <- opts.qualityScore (TSMQualityScoreEngine result)
 *   Exception Report       <- opts.explainItems filtered to open findings,
 *                            same list Quality Report scored
 *   Risk Report            <- high-severity subset of the same findings
 *   Audit Trail            <- TSM.evidenceLedger.forDomain(domain), if the
 *                            evidence ledger is loaded — this is real,
 *                            already-recorded provenance, not synthesized
 *   Recommended Actions   <- TSMExecutiveOutcome.build()'s whatShouldWeDo
 *   Executive Summary      <- TSMExecutiveOutcome.build()'s full four-question
 *                            view (#7), reused rather than re-derived
 *
 * Usage:
 *   const pkg = TSMDeliveryPackage.build({
 *     domain: 'Healthcare',
 *     documentCount: 9842,
 *     qualityScore: qs,
 *     explainItems: items,
 *     missionQueueSummary: summary,
 *     missionQueue: queue
 *   });
 *   // pkg.auditTrail is [] if evidence-ledger.js isn't loaded — honestly
 *   // empty, not fabricated, same convention as the rest of this codebase.
 * ========================================================================== */

(function (global) {
  'use strict';

  function getAuditTrail(domain) {
    if (global.TSM && global.TSM.evidenceLedger && typeof global.TSM.evidenceLedger.forDomain === 'function') {
      return global.TSM.evidenceLedger.forDomain(domain);
    }
    return []; // evidence-ledger.js not loaded in this context — honest empty, not fabricated
  }

  function getExecutiveOutcome(opts) {
    if (global.TSMExecutiveOutcome && typeof global.TSMExecutiveOutcome.build === 'function') {
      return global.TSMExecutiveOutcome.build(opts);
    }
    return null; // tsm-executive-outcome.js not loaded — caller should load it for a real summary
  }

  function build(opts) {
    opts = opts || {};
    var items = Array.isArray(opts.explainItems) ? opts.explainItems : [];
    var exceptions = items.filter(function (it) { return it && it.claim; });
    var riskItems = exceptions.filter(function (it) { return it.severity === 'high'; });
    var outcome = getExecutiveOutcome(opts);

    return {
      domain: opts.domain || 'Unknown',
      generatedAt: new Date().toISOString(),
      processedDocuments: {
        count: opts.documentCount != null ? opts.documentCount : null // honest null if not supplied
      },
      structuredData: {
        items: exceptions
      },
      qualityReport: opts.qualityScore || null,
      exceptionReport: {
        total: exceptions.length,
        items: exceptions
      },
      riskReport: {
        highSeverityCount: riskItems.length,
        items: riskItems
      },
      auditTrail: getAuditTrail(opts.domain),
      recommendedActions: outcome ? outcome.whatShouldWeDo : [],
      executiveSummary: outcome
    };
  }

  var TSMDeliveryPackage = { build: build };

  global.TSMDeliveryPackage = TSMDeliveryPackage;
  if (typeof module !== 'undefined' && module.exports) module.exports = TSMDeliveryPackage;

})(typeof window !== 'undefined' ? window : this);

// ── Self-test (run directly with `node tsm-delivery-package.js`) ──────────
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var Pkg = module.exports;

  var sampleItems = [
    { id: 'f1', claim: 'CLM-1001 denied for medical necessity', severity: 'high', confidence: 94 },
    { id: 'f2', claim: 'CPT 99215 coding mismatch on CLM-1002', severity: 'med', confidence: 80 }
  ];
  var sampleQualityScore = { overall: 97, band: 'STRONG', openFindings: 2, recordCount: 9842 };

  // Note: no evidence-ledger.js or tsm-executive-outcome.js loaded in this
  // Node self-test context, so auditTrail/executiveSummary correctly come
  // back empty/null below -- that's the honest-fallback path, not a bug.
  var pkg = Pkg.build({
    domain: 'Healthcare',
    documentCount: 9842,
    qualityScore: sampleQualityScore,
    explainItems: sampleItems
  });

  console.log(JSON.stringify(pkg, null, 2));
}