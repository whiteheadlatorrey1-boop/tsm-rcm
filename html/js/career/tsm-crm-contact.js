'use strict';

/*
 * TSM Phase 12C — Employer Contact.
 */

var VERSION = '12C.0';

var ROLES = [
  'hiring_manager',
  'recruiter',
  'hr',
  'operations',
  'executive',
  'procurement',
  'other'
];

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function createContact(input) {
  input = input || {};

  return {
    contactId: clean(input.contactId || input.id),
    accountId: clean(input.accountId),
    firstName: clean(input.firstName),
    lastName: clean(input.lastName),
    email: clean(input.email),
    phone: clean(input.phone),
    title: clean(input.title),
    role: clean(input.role || 'other'),
    status: clean(input.status || 'active')
  };
}

function validateContact(contact) {
  var failures = [];
  contact = contact || {};

  if (!contact.contactId) failures.push('contact_id_required');
  if (!contact.accountId) failures.push('account_id_required');
  if (!contact.email && !contact.phone) {
    failures.push('contact_channel_required');
  }

  if (ROLES.indexOf(contact.role) < 0) {
    failures.push('invalid_contact_role');
  }

  return {
    valid: failures.length === 0,
    failures: failures
  };
}

function listByAccount(contacts, accountId) {
  var id = clean(accountId);

  return (Array.isArray(contacts) ? contacts : []).filter(function (contact) {
    return clean(contact.accountId) === id;
  });
}

module.exports = {
  VERSION: VERSION,
  ROLES: ROLES.slice(),
  createContact: createContact,
  validateContact: validateContact,
  listByAccount: listByAccount
};
