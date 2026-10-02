'use strict';

/*
 * TSM Phase 12B — Employer Account.
 */

var VERSION = '12B.0';

var STATES = [
  'prospect',
  'active',
  'inactive'
];

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function createAccount(input) {
  input = input || {};

  return {
    accountId: clean(input.accountId || input.id),
    name: clean(input.name),
    industry: clean(input.industry),
    website: clean(input.website),
    status: clean(input.status || 'prospect'),
    ownerId: clean(input.ownerId) || null,
    source: clean(input.source || 'crm')
  };
}

function transition(account, nextState) {
  account = account || {};

  var from = clean(account.status || 'prospect');
  var to = clean(nextState);

  if (STATES.indexOf(to) < 0) {
    throw new Error('invalid account state');
  }

  var allowed = {
    prospect: ['active', 'inactive'],
    active: ['inactive'],
    inactive: ['active']
  };

  if (!allowed[from] || allowed[from].indexOf(to) < 0) {
    throw new Error(
      'invalid account transition: ' + from + ' -> ' + to
    );
  }

  return Object.assign({}, account, {
    status: to
  });
}

module.exports = {
  VERSION: VERSION,
  STATES: STATES.slice(),
  createAccount: createAccount,
  transition: transition
};
