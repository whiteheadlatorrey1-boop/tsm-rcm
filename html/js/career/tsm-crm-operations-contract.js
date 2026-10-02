'use strict';

/*
 * TSM Phase 12A — CRM / Employer Operations Contract
 *
 * Pure contract layer.
 * No persistence.
 * Candidate Registry remains canonical for candidate identity.
 * Staffing remains canonical for placement lifecycle.
 * HR remains canonical for employment lifecycle.
 */

var VERSION = '12A.0';

var CONTRACT = 'crm_employer_operations';

var ACCOUNT_STATES = [
  'prospect',
  'active',
  'inactive'
];

var OPPORTUNITY_STATES = [
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

function normalizeAccount(account) {
  account = account || {};

  return {
    accountId: clean(account.accountId || account.id),
    name: clean(account.name),
    industry: clean(account.industry),
    website: clean(account.website),
    status: clean(account.status || 'prospect'),
    ownerId: clean(account.ownerId)
  };
}

function createContract(input) {
  input = input || {};

  return {
    contract: CONTRACT,
    version: VERSION,
    account: normalizeAccount(input.account),
    contacts: Array.isArray(input.contacts)
      ? input.contacts.slice()
      : [],
    opportunities: Array.isArray(input.opportunities)
      ? input.opportunities.slice()
      : [],
    jobOrders: Array.isArray(input.jobOrders)
      ? input.jobOrders.slice()
      : [],
    activities: Array.isArray(input.activities)
      ? input.activities.slice()
      : [],
    evidence: Array.isArray(input.evidence)
      ? input.evidence.slice()
      : [],
    provenance: {
      source: CONTRACT,
      version: VERSION
    }
  };
}

function createEmptyContract(accountId) {
  return createContract({
    account: {
      accountId: accountId
    }
  });
}

module.exports = {
  VERSION: VERSION,
  CONTRACT: CONTRACT,
  ACCOUNT_STATES: ACCOUNT_STATES.slice(),
  OPPORTUNITY_STATES: OPPORTUNITY_STATES.slice(),
  normalizeAccount: normalizeAccount,
  createContract: createContract,
  createEmptyContract: createEmptyContract
};
