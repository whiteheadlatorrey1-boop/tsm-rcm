/**
 * decision-provenance.js
 *
 * Builds the human-readable "why" for a decision by joining:
 *   - the evidence ledger record
 *   - the rules/policies that fired (policy-intelligence)
 *   - the data references cited
 *   - any prior corrected record (correction chain)
 *
 * This is the module the explainability register calls into. It returns
 * plain objects shaped for getExplainItems() / renderExplainCards() so no
 * portal-side changes are required beyond wiring the call in.
 */

function buildProvenance(decisionId, deps) {
  deps = deps || {};
  const evidenceLedger = deps.evidenceLedger;
  const policyEngine = deps.policyEngine;

  if (!evidenceLedger) {
    throw new Error('decision-provenance requires an evidenceLedger instance');
  }

  const records = evidenceLedger.getByDecisionId(decisionId);
  if (!records.length) {
    return { decisionId: decisionId, found: false, items: [] };
  }

  // Walk the correction chain to find the current/authoritative record.
  let current = records[records.length - 1];
  const chain = [current];
  let guard = 0;
  while (current.correctsRecordId && guard < 20) {
    const prior = records.find(function (r) { return r.id === current.correctsRecordId; });
    if (!prior) break;
    chain.push(prior);
    current = prior;
    guard += 1;
  }

  const ruleDetails = (current.ruleIds || []).map(function (ruleId) {
    if (policyEngine && typeof policyEngine.describeRule === 'function') {
      return policyEngine.describeRule(ruleId);
    }
    return { ruleId: ruleId, description: null };
  });

  const confidenceLabel = current.confidence != null
    ? Math.round(current.confidence * 100) + '%'
    : 'n/a';

  return {
    decisionId: decisionId,
    found: true,
    summary: current.summary,
    confidence: current.confidence,
    actor: current.actor,
    timestamp: current.ts,
    ruleDetails: ruleDetails,
    dataRefs: current.dataRefs,
    approvals: current.approvals,
    outcomes: current.outcomes,
    correctionDepth: chain.length - 1,
    items: [
      { label: 'Decision', value: current.summary },
      { label: 'Confidence', value: confidenceLabel },
      { label: 'Rules Applied', value: ruleDetails.map(function (r) { return r.description || r.ruleId; }).join(', ') || 'none recorded' },
      { label: 'Data Sources', value: (current.dataRefs || []).join(', ') || 'none recorded' },
      { label: 'Approvals', value: current.approvals.length ? (current.approvals.length + ' recorded') : 'not required / none recorded' },
      { label: 'Outcomes Logged', value: current.outcomes.length ? String(current.outcomes.length) : 'none yet' },
    ],
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildProvenance: buildProvenance };
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.buildProvenance = buildProvenance;
}
