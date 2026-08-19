/**
 * TSM Universal BPO Output Contract Engine
 * Standardizes operational deliverables across all verticals.
 */

const VERTICAL_CONTRACTS = {
  healthcare: ["case_summary", "decision", "evidence_checklist", "recommended_action", "appeal_letter", "work_item", "audit_record"],
  mortgage: ["loan_summary", "exception_report", "conditions_checklist", "borrower_request", "processor_tasks", "escalation", "audit_record"],
  construction: ["rfi_case", "submittal_review", "change_order_analysis", "invoice_exception_report", "missing_document_request", "audit_record"],
  finops: ["invoice_exception", "three_way_match_result", "vendor_case", "reconciliation_exception", "approval_request", "audit_record"],
  insurance: ["claim_case", "coverage_analysis", "missing_document_request", "claim_summary", "recommended_action", "audit_record"],
  real_estate: ["property_exception_report", "work_order", "vendor_request", "compliance_task", "tenant_communication", "audit_record"],
  legalops: ["matter_brief", "clause_risk_summary", "missing_information_request", "review_queue", "audit_record"],
  bpo: ["work_item", "qa_score", "sla_exception", "escalation", "audit_record"],
  default: ["case_summary", "exception_report", "recommended_action", "work_item", "audit_record"]
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

module.exports = {
  VERTICAL_CONTRACTS,
  enforceOutputContract
};
