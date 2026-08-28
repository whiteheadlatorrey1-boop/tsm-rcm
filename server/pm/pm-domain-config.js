'use strict';

/**
 * PM Copilot domain config for the shared decision-engine core.
 * Extracted verbatim from the original server/pm/decision-engine.js
 * (pre-refactor) -- behavior is unchanged, just relocated.
 */

function text(value) {
  return value == null ? '' : String(value);
}

function ownerFor(domain) {
  return {
    vendor_compliance: 'Vendor Management',
    maintenance: 'Maintenance Operations',
    vacancy: 'Leasing / Property Management',
    lease: 'Leasing / Property Management',
    turnover: 'Property Management',
    iot: 'Maintenance Operations'
  }[domain] || 'Property Management';
}

function urgencyFor(priority, domain) {
  if (priority === 'CRITICAL') return 'Immediate';
  if (domain === 'maintenance') return priority === 'HIGH' ? 'Today' : 'Next business day';
  if (priority === 'HIGH') return 'Today';
  return 'This week';
}

function actionFor(domain, item) {
  const id = item.id || item.work_order_id || item.vendor_id || item.unit_id || item.sensor_id;

  switch (domain) {
    case 'vendor_compliance':
      return text(item.status || item.stage).toLowerCase() === 'expired'
        ? `Suspend new work assignment to ${id || 'the affected vendor'} and initiate compliance renewal/replacement review.`
        : `Complete compliance renewal for ${id || 'the affected vendor'} before the credential expires.`;

    case 'maintenance':
      return `Escalate ${id || 'the overdue work order'} and confirm vendor response, next milestone, and SLA recovery plan.`;

    case 'vacancy':
      return `Assign a leasing action plan for ${id || 'the vacant unit'} and review pricing, make-ready, and showing readiness.`;

    case 'lease':
      return `Initiate renewal outreach for ${id || 'the affected lease'} and record the renewal decision path.`;

    case 'turnover':
      return `Escalate ${id || 'the turnover'} and establish a dated completion plan with accountable owner.`;

    case 'iot':
      return `Dispatch inspection/remediation for ${id || 'the affected sensor alert'} and verify the condition clears after remediation.`;

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

  if (/vendor|certificate|compliance|license|insurance/.test(raw)) return 'vendor_compliance';
  if (/work.?order|maintenance|sla|repair/.test(raw)) return 'maintenance';
  if (/vacan|unit/.test(raw)) return 'vacancy';
  if (/lease|renew/.test(raw)) return 'lease';
  if (/turnover|make.?ready/.test(raw)) return 'turnover';
  if (/iot|sensor|thermostat|leak|door/.test(raw)) return 'iot';

  return 'operations';
}

module.exports = {
  inferDomain,
  ownerFor,
  urgencyFor,
  actionFor,
  namedExposureBuckets: {
    maintenance_delay_exposure_items: 'maintenance',
    vendor_compliance_exposure_items: 'vendor_compliance',
    vacancy_exposure_items: 'vacancy',
    iot_alerts: 'iot'
  },
  highExposurePriorityDomains: ['vendor_compliance'],
  defaultHeadline: 'PM portfolio operating position requires management review.'
};
