'use strict';

/*
 * TSM Phase 12E — Employer Job Order.
 *
 * CRM owns the employer-side job-order request.
 * Staffing owns candidate matching and placement lifecycle.
 */

var VERSION = '12E.0';

var STATES = [
  'draft',
  'open',
  'on_hold',
  'filled',
  'cancelled',
  'closed'
];

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function createJobOrder(input) {
  input = input || {};

  return {
    jobOrderId: clean(input.jobOrderId || input.id),
    accountId: clean(input.accountId),
    opportunityId: clean(input.opportunityId) || null,
    contactId: clean(input.contactId) || null,
    title: clean(input.title),
    department: clean(input.department),
    location: clean(input.location),
    employmentType: clean(input.employmentType),
    openings: Number.isFinite(Number(input.openings))
      ? Number(input.openings)
      : 1,
    requirements: Array.isArray(input.requirements)
      ? input.requirements.slice()
      : [],
    state: clean(input.state || 'draft'),
    ownerId: clean(input.ownerId) || null
  };
}

function transition(jobOrder, nextState) {
  jobOrder = jobOrder || {};

  var from = clean(jobOrder.state || 'draft');
  var to = clean(nextState);

  if (STATES.indexOf(to) < 0) {
    throw new Error('invalid job order state');
  }

  var allowed = {
    draft: ['open', 'cancelled'],
    open: ['on_hold', 'filled', 'cancelled', 'closed'],
    on_hold: ['open', 'cancelled', 'closed'],
    filled: ['closed'],
    cancelled: [],
    closed: []
  };

  if (!allowed[from] || allowed[from].indexOf(to) < 0) {
    throw new Error(
      'invalid job order transition: ' + from + ' -> ' + to
    );
  }

  return Object.assign({}, jobOrder, {
    state: to
  });
}

function toStaffingInput(jobOrder) {
  jobOrder = jobOrder || {};

  return {
    jobOrderId: clean(jobOrder.jobOrderId),
    accountId: clean(jobOrder.accountId),
    title: clean(jobOrder.title),
    requirements: Array.isArray(jobOrder.requirements)
      ? jobOrder.requirements.slice()
      : [],
    openings: jobOrder.openings,
    source: 'crm_employer_operations'
  };
}

module.exports = {
  VERSION: VERSION,
  STATES: STATES.slice(),
  createJobOrder: createJobOrder,
  transition: transition,
  toStaffingInput: toStaffingInput
};
