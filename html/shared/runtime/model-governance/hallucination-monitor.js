/**
 * hallucination-monitor.js
 *
 * Heuristic, not magic: flags model outputs that cite data references
 * (dataRefs) not present in the context that was actually sent, or that
 * exceed a confidence claim without evidence attached. Meant to feed
 * Phase 42's evidence ledger with a 'flagged' status rather than to block
 * anything automatically -- a human reviews flags.
 */

function checkForUnsupportedClaims(output, contextDataRefs) {
  const knownRefs = new Set(contextDataRefs || []);
  const citedRefPattern = /\[ref:([a-zA-Z0-9_\-]+)\]/g;
  const flags = [];
  let match;

  while ((match = citedRefPattern.exec(output)) !== null) {
    const ref = match[1];
    if (!knownRefs.has(ref)) {
      flags.push({ type: 'unsupported_reference', ref: ref });
    }
  }

  return { hasFlags: flags.length > 0, flags: flags };
}

function checkConfidenceConsistency(output, declaredConfidence, minEvidenceItems) {
  const evidenceMentions = (output.match(/\[ref:[a-zA-Z0-9_\-]+\]/g) || []).length;
  const threshold = minEvidenceItems != null ? minEvidenceItems : 1;

  if (declaredConfidence != null && declaredConfidence > 0.8 && evidenceMentions < threshold) {
    return {
      consistent: false,
      reason: 'High confidence (' + declaredConfidence + ') declared with only ' + evidenceMentions + ' evidence reference(s).',
    };
  }

  return { consistent: true, reason: null };
}

function evaluateOutput(output, opts) {
  opts = opts || {};
  const refCheck = checkForUnsupportedClaims(output, opts.contextDataRefs);
  const confCheck = checkConfidenceConsistency(output, opts.declaredConfidence, opts.minEvidenceItems);

  return {
    flaggedForReview: refCheck.hasFlags || !confCheck.consistent,
    unsupportedReferences: refCheck.flags,
    confidenceCheck: confCheck,
    evaluatedAt: new Date().toISOString(),
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { checkForUnsupportedClaims: checkForUnsupportedClaims, checkConfidenceConsistency: checkConfidenceConsistency, evaluateOutput: evaluateOutput };
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.hallucinationMonitor = { evaluateOutput: evaluateOutput };
}
