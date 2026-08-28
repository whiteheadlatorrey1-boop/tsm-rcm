'use strict';

/**
 * Construction domain config for the shared decision-engine core
 * (server/shared/decision-engine-core.js).
 *
 * Domains:
 *   cost_overrun        -- budget exceptions, change-order exposure
 *   schedule_delay       -- milestone slippage, critical-path exposure
 *   permit_compliance    -- expired/missing permits, inspection failures
 *   safety_incident       -- OSHA/safety findings
 */

function text(value) {
  return value == null ? '' : String(value);
}

function ownerFor(domain) {
  return {
    cost_overrun: 'Project Controls',
    schedule_delay: 'Project Management',
    permit_compliance: 'Compliance / Permitting',
    safety_incident: 'Safety / EHS'
  }[domain] || 'Project Management';
}

function urgencyFor(priority, domain) {
  if (priority === 'CRITICAL') return 'Immediate';
  if (domain === 'safety_incident') return 'Immediate';
  if (domain === 'schedule_delay') return priority === 'HIGH' ? 'Today' : 'Next business day';
  if (priority === 'HIGH') return 'Today';
  return 'This week';
}

function actionFor(domain, item) {
  const id = item.id || item.permit_id || item.work_order_id || item.node_id;

  switch (domain) {
    case 'cost_overrun':
      return `Review the budget exception on ${id || 'the affected line item'} and confirm change-order status with the GC.`;

    case 'schedule_delay':
      return `Escalate ${id || 'the delayed milestone'} and confirm recovery plan against the critical path.`;

    case 'permit_compliance':
      return text(item.status || item.stage).toLowerCase() === 'expired'
        ? `Halt affected work under ${id || 'the expired permit'} until renewal is confirmed with the AHJ.`
        : `Complete permit renewal for ${id || 'the affected permit'} before the compliance window closes.`;

    case 'safety_incident':
      return `Escalate ${id || 'the safety finding'} to Safety/EHS immediately and confirm corrective action before work resumes.`;

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

  if (/cost|budget|change.?order|overrun/.test(raw)) return 'cost_overrun';
  if (/schedule|delay|milestone|critical.?path/.test(raw)) return 'schedule_delay';
  if (/permit|inspection|ahj|code/.test(raw)) return 'permit_compliance';
  if (/safety|osha|incident|injury/.test(raw)) return 'safety_incident';

  return 'operations';
}

module.exports = {
  inferDomain,
  ownerFor,
  urgencyFor,
  actionFor,
  namedExposureBuckets: {
    cost_overrun_items: 'cost_overrun',
    schedule_delay_items: 'schedule_delay',
    permit_compliance_items: 'permit_compliance',
    safety_incident_items: 'safety_incident'
  },
  highExposurePriorityDomains: ['safety_incident'],
  defaultHeadline: 'Construction portfolio operating position requires management review.'
};
