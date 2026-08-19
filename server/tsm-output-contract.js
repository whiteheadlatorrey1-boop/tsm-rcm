/**
 * TSM Universal BPO Output Contract Engine
 * Standardizes operational deliverables across all verticals.
 */

const VERTICAL_CONTRACTS = {
  healthcare: ["case_summary", "decision", "evidence_checklist", "recommended_action", "appeal_letter", "work_item", "audit_record"],
  mortgage: ["loan_summary", "exception_report", "conditions_checklist", "borrower_request", "processor_tasks", "escalation", "audit_record"],
  construction: ["rfi_case", "submittal_review", "change_order_analysis", "invoice_exception_report", "missing_document_request", "audit_record"],
  finops: ["invoice_exception", "three_way_match_result", "vendor_case", "reconciliation_exception", "approval_request", "audit_record"],
  default: ["case_summary", "exception_report", "recommended_action", "work_item", "audit_record"]
};

function enforceOutputContract(vertical, payload = {}) {
  const key = (vertical || "").toLowerCase();
  const requiredOutputs = VERTICAL_CONTRACTS[key] || VERTICAL_CONTRACTS.default;
  
  const missing = requiredOutputs.filter(field => payload[field] === undefined);

  return {
    contract_outputs: requiredOutputs,
    vertical: key || "default",
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
