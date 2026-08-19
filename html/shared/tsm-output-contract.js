/**
 * TSM Output Contract Engine
 * ---------------------------------------------------------------------
 * NOTE: mirrored at server/tsm-output-contract.js for server-side/Node
 * use (this copy is the one actually served to browser pages).
 * Keep both copies identical -- update both on any change.
 * ---------------------------------------------------------------------
 * Validates that a vertical's "structured case" object (the analysis
 * output already built client-side by each war-room strategist page --
 * see html/shared/tsm-sla-extractor.js and each page's
 * build<Vertical>StructuredCase() function) contains the fields that
 * vertical is expected to produce, before that case is treated as
 * ready for human review / relay to the executive portal.
 *
 * IMPORTANT -- schema scope: these contracts check the ANALYSIS layer
 * that exists in code today (deadline, evidence, exposure, confidence,
 * etc.), not the higher-level "finished deliverable" layer (a drafted
 * appeal letter, an audit-log write, a work-queue task) described in
 * planning docs. That deliverable layer isn't built yet for any
 * vertical, so contracts for it would never be satisfiable. When that
 * layer exists, it should get its own contract (or an additional
 * required-fields tier here) rather than being faked into this one.
 *
 * Only verticals with a real build*StructuredCase() function get a
 * dedicated entry. A vertical with no entry falls through to
 * `default` and enforceOutputContract() reports
 * used_default_fallback:true so callers can tell "checked against a
 * real vertical contract" apart from "no contract exists yet for
 * this vertical". Confirmed against source as of 2026-08-19:
 *   - healthcare: html/healthcare/hc-denial-war-room.html -> buildHCStructuredCase()
 *   - legalops:   html/war-rooms/legal-war/legal-main-strategist.html -> buildLegalStructuredCase()
 *   - insurance:  html/war-rooms/insure-war/insurance-strategist.html -> buildInsuranceStructuredCase()
 *   - finops:     html/finops-suite/finops-war/finops-main-strategist.html -> buildFinOpsStructuredCase()
 * Mortgage, Construction, Real Estate, and BPO have no structured-case
 * builder yet as of this writing -- do not add entries for them here
 * until one exists to check against.
 */

const VERTICAL_CONTRACTS = {
  // Richer, denial-specific shape -- buildHCStructuredCase() always returns
  // all of these keys (value may be null when not found in source text).
  healthcare: [
    "claimId", "payer", "denialReasonCode", "denialCategory",
    "rootCauseHypothesis", "appealable", "appealDeadline",
    "recoveryLikelihood", "confidence", "confidenceTier",
    "humanReviewRequired", "financialExposure", "evidenceProvenance"
  ],
  // Shared shape used identically by Legal, Insurance, and FinOps --
  // all three call into the same html/shared/tsm-sla-extractor.js helpers.
  legalops: ["deadline", "requiredEvidence", "financialExposure", "confidence", "confidenceTier", "humanReviewRequired"],
  insurance: ["deadline", "requiredEvidence", "financialExposure", "confidence", "confidenceTier", "humanReviewRequired"],
  finops: ["deadline", "requiredEvidence", "financialExposure", "confidence", "confidenceTier", "humanReviewRequired"],
  // Generic fallback for any vertical without a dedicated contract yet.
  default: ["deadline", "confidence", "humanReviewRequired"]
};

function enforceOutputContract(vertical, payload = {}) {
  const key = (vertical || "").toLowerCase();
  const usedDefaultFallback = !Object.prototype.hasOwnProperty.call(VERTICAL_CONTRACTS, key);
  const requiredOutputs = VERTICAL_CONTRACTS[key] || VERTICAL_CONTRACTS.default;

  const missing = requiredOutputs.filter(field => payload[field] === undefined);

  return {
    contract_outputs: requiredOutputs,
    vertical: key || "default",
    contract_used: usedDefaultFallback ? "default" : key,
    used_default_fallback: usedDefaultFallback,
    timestamp: new Date().toISOString(),
    is_compliant: missing.length === 0,
    missing_fields: missing,
    payload
  };
}

(function (global) {
  var TSMOutputContract = { VERTICAL_CONTRACTS: VERTICAL_CONTRACTS, enforceOutputContract: enforceOutputContract };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = TSMOutputContract;
  }
  if (typeof global !== "undefined") {
    global.TSMOutputContract = TSMOutputContract;
  }
})(typeof window !== "undefined" ? window : this);
