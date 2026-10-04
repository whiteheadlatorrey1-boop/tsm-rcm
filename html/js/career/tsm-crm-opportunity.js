'use strict';

/*
 * TSM Phase 12D — Lead / Opportunity.
 */

var VERSION = '12D.0';

var STATES = [
  'open',
  'qualified',
  'proposal',
  'won',
  'lost',
  'closed'
];

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function createLead(input) {
  input = input || {};

  return {
    leadId: clean(input.leadId || input.id),
    companyName: clean(input.companyName),
    contactId: clean(input.contactId) || null,
    source: clean(input.source || 'direct'),
    subject: clean(input.subject),
    state: 'open',
    ownerId: clean(input.ownerId) || null
  };
}

function qualifyLead(lead, accountId) {
  lead = lead || {};

  if (!clean(accountId)) {
    throw new Error('account_id_required');
  }

  return Object.assign({}, lead, {
    accountId: clean(accountId),
    state: 'qualified'
  });
}

function createOpportunity(input) {
  input = input || {};

  return {
    opportunityId: clean(input.opportunityId || input.id),
    accountId: clean(input.accountId),
    contactId: clean(input.contactId) || null,
    name: clean(input.name),
    state: clean(input.state || 'open'),
    estimatedValue: input.estimatedValue == null
      ? null
      : Number(input.estimatedValue),
    ownerId: clean(input.ownerId) || null
  };
}

function transition(opportunity, nextState) {
  opportunity = opportunity || {};

  var from = clean(opportunity.state || 'open');
  var to = clean(nextState);

  if (STATES.indexOf(to) < 0) {
    throw new Error('invalid opportunity state');
  }

  var allowed = {
    open: ['qualified', 'lost', 'closed'],
    qualified: ['proposal', 'lost', 'closed'],
    proposal: ['won', 'lost', 'closed'],
    won: ['closed'],
    lost: ['closed'],
    closed: []
  };

  if (!allowed[from] || allowed[from].indexOf(to) < 0) {
    throw new Error(
      'invalid opportunity transition: ' + from + ' -> ' + to
    );
  }

  return Object.assign({}, opportunity, {
    state: to
  });
}

module.exports = {
  VERSION: VERSION,
  STATES: STATES.slice(),
  createLead: createLead,
  qualifyLead: qualifyLead,
  createOpportunity: createOpportunity,
  transition: transition
};
