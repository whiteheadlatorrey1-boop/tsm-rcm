'use strict';

/**
 * Healthcare (RCM) domain config for the shared decision-engine core
 * (server/shared/decision-engine-core.js).
 *
 * Domains (drawn from existing HC frontend vocabulary --
 * html/healthcare/mission-panel.js, html/healthcare/executive-portal.html --
 * not invented for this file):
 *   denial_exception    -- open/rejected claims requiring resolution before resubmission
 *   appeal_pipeline     -- appeals in flight against a payer response window
 *   ar_aging            -- accounts receivable aging past normal follow-up windows
 *   coding_underpayment -- ERA/fee-schedule variance, coding review, underpayment recovery
 */

function text(value) {
  return value == null ? '' : String(value);
}

function ownerFor(domain) {
  return {
    denial_exception: 'Denial Management',
    appeal_pipeline: 'Appeals',
    ar_aging: 'AR Follow-up',
    coding_underpayment: 'Coding / Revenue Integrity'
  }[domain] || 'Revenue Cycle Management';
}

function urgencyFor(priority, domain) {
  if (priority === 'CRITICAL') return 'Immediate';
  if (domain === 'appeal_pipeline') return 'Before appeal deadline';
  if (domain === 'ar_aging') return priority === 'HIGH' ? 'Today' : 'This week';
  if (priority === 'HIGH') return 'Today';
  return 'This week';
}

function actionFor(domain, item) {
  const id = item.id || item.claimId || item.claim_id || item.accountId || item.account_id;

  switch (domain) {
    case 'denial_exception':
      return `Resolve the denial on ${id || 'the affected claim'} and confirm root cause before resubmission.`;

    case 'appeal_pipeline':
      return `Complete the appeal on ${id || 'the affected claim'} and log it in the AR tracker before the payer response window closes.`;

    case 'ar_aging':
      return `Prioritize AR follow-up on ${id || 'the affected account'} before it crosses the next aging bucket.`;

    case 'coding_underpayment':
      return `Reconcile the ERA payment against the fee schedule for ${id || 'the affected claim'} and initiate an underpayment appeal if variance is confirmed.`;

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

  if (/denial|denied|reject|co-?\d+|medical necessity/.test(raw)) return 'denial_exception';
  if (/appeal/.test(raw)) return 'appeal_pipeline';
  if (/aging|past.?due|ar\b|accounts receivable|follow-?up/.test(raw)) return 'ar_aging';
  if (/coding|underpay|era|fee schedule|variance/.test(raw)) return 'coding_underpayment';

  return 'operations';
}

module.exports = {
  inferDomain,
  ownerFor,
  urgencyFor,
  actionFor,
  namedExposureBuckets: {
    denial_exception_items: 'denial_exception',
    appeal_pipeline_items: 'appeal_pipeline',
    ar_aging_items: 'ar_aging',
    coding_underpayment_items: 'coding_underpayment'
  },
  highExposurePriorityDomains: ['denial_exception'],
  defaultHeadline: 'Healthcare revenue cycle operating position requires management review.'
};
