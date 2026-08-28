'use strict';

/**
 * Mortgage domain config for the shared decision-engine core
 * (server/shared/decision-engine-core.js).
 *
 * Domains:
 *   compliance_exception  -- expired/missing regulatory docs, audit findings
 *   condition_pipeline    -- outstanding loan conditions blocking closing
 *   delinquency           -- past-due / at-risk loan payments
 *   document_deficiency   -- missing/incomplete borrower or file documents
 */

function text(value) {
  return value == null ? '' : String(value);
}

function ownerFor(domain) {
  return {
    compliance_exception: 'Compliance / QC',
    condition_pipeline: 'Loan Processing',
    delinquency: 'Loan Servicing',
    document_deficiency: 'Loan Processing'
  }[domain] || 'Loan Servicing';
}

function urgencyFor(priority, domain) {
  if (priority === 'CRITICAL') return 'Immediate';
  if (domain === 'delinquency') return priority === 'HIGH' ? 'Today' : 'Next business day';
  if (priority === 'HIGH') return 'Today';
  return 'This week';
}

function actionFor(domain, item) {
  const id = item.id || item.loan_id || item.loanId || item.condition_id || item.borrower_id;

  switch (domain) {
    case 'compliance_exception':
      return text(item.status || item.stage).toLowerCase() === 'expired'
        ? `Halt further processing on ${id || 'the affected loan file'} and initiate compliance remediation before proceeding.`
        : `Resolve the compliance exception on ${id || 'the affected loan file'} before the audit window closes.`;

    case 'condition_pipeline':
      return `Clear the outstanding condition on ${id || 'the affected loan'} and confirm updated closing timeline with the borrower.`;

    case 'delinquency':
      return `Escalate ${id || 'the delinquent loan'} to servicing for borrower outreach and confirm a recovery or workout plan.`;

    case 'document_deficiency':
      return `Request the missing document on ${id || 'the affected file'} and confirm receipt before the file re-enters underwriting.`;

    default:
      return `Review ${id || 'the finding'} and assign an accountable owner with a dated next action.`;
  }
}

function inferDomain(item) {
  const raw = [
    item.domain,
    item.category,
    item.type,
    item.source,
    item.id,
    item.claim,
    item.rationale,
    item.description
  ].join(' ').toLowerCase();

  if (/complian|audit|regulat|license|disclosure/.test(raw)) return 'compliance_exception';
  if (/condition|pipeline|underwrit/.test(raw)) return 'condition_pipeline';
  if (/delinquen|past.?due|default|payment/.test(raw)) return 'delinquency';
  if (/document|missing.?doc|deficien|paystub|w-?2|verification/.test(raw)) return 'document_deficiency';

  return 'operations';
}

module.exports = {
  inferDomain,
  ownerFor,
  urgencyFor,
  actionFor,
  namedExposureBuckets: {
    compliance_exception_items: 'compliance_exception',
    condition_pipeline_items: 'condition_pipeline',
    delinquency_items: 'delinquency',
    document_deficiency_items: 'document_deficiency'
  },
  highExposurePriorityDomains: ['compliance_exception'],
  defaultHeadline: 'Mortgage pipeline operating position requires management review.'
};
