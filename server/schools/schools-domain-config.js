'use strict';

/**
 * Schools/Grants domain config for the shared decision-engine core
 * (server/shared/decision-engine-core.js).
 *
 * Domains (drawn from the existing /api/schools/analysis prompt vocabulary
 * in server.js -- kpis/grant_breaches/monitoring_items/exceptions, and the
 * FERPA/IDEA/NSLP/Title I/ESSER framing already used there -- not invented
 * for this file):
 *   grant_breach        -- SLA or budget breaches on an active grant file
 *   monitoring_stall     -- stalled/overdue monitoring items blocking a review cycle
 *   compliance_exception -- open FERPA/IDEA/NSLP/Title I/ESSER exceptions requiring escalation
 */

function text(value) {
  return value == null ? '' : String(value);
}

function ownerFor(domain) {
  return {
    grant_breach: 'Grants Management',
    monitoring_stall: 'Program Monitoring',
    compliance_exception: 'Compliance / Federal Programs'
  }[domain] || 'Grants Management';
}

function urgencyFor(priority, domain) {
  if (priority === 'CRITICAL') return 'Immediate';
  if (domain === 'compliance_exception') return priority === 'HIGH' ? 'Today' : 'This week';
  if (priority === 'HIGH') return 'Today';
  return 'This week';
}

function actionFor(domain, item) {
  const id = item.id || item.grantId || item.grant_id || item.itemId || item.item_id;

  switch (domain) {
    case 'grant_breach':
      return `Resolve the breach on ${id || 'the affected grant file'} and confirm the corrected budget/SLA position with the program office.`;

    case 'monitoring_stall':
      return `Clear the stalled monitoring item on ${id || 'the affected grant file'} and confirm the review cycle can proceed.`;

    case 'compliance_exception':
      return `Escalate the open compliance exception on ${id || 'the affected file'} to Federal Programs and confirm a remediation deadline.`;

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

  if (/breach|budget|overspend|sla/.test(raw)) return 'grant_breach';
  if (/monitor|stall|overdue|review cycle/.test(raw)) return 'monitoring_stall';
  if (/ferpa|idea|nslp|title i|esser|complian|escalat/.test(raw)) return 'compliance_exception';

  return 'operations';
}

module.exports = {
  inferDomain,
  ownerFor,
  urgencyFor,
  actionFor,
  namedExposureBuckets: {
    grant_breach_items: 'grant_breach',
    monitoring_stall_items: 'monitoring_stall',
    compliance_exception_items: 'compliance_exception'
  },
  highExposurePriorityDomains: ['compliance_exception'],
  defaultHeadline: 'Schools/Grants compliance operating position requires management review.'
};
