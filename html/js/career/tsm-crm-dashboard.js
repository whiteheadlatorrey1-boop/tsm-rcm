'use strict';

/*
 * TSM Phase 12H — CRM Dashboard View Model.
 */

var VERSION = '12H.0';

function countState(records, state) {
  return (Array.isArray(records) ? records : []).filter(function (item) {
    return item.state === state || item.status === state;
  }).length;
}

function buildDashboard(input) {
  input = input || {};

  var account = input.account || {};
  var contacts = Array.isArray(input.contacts)
    ? input.contacts
    : [];
  var opportunities = Array.isArray(input.opportunities)
    ? input.opportunities
    : [];
  var jobOrders = Array.isArray(input.jobOrders)
    ? input.jobOrders
    : [];
  var activities = Array.isArray(input.activities)
    ? input.activities
    : [];
  var evidence = Array.isArray(input.evidence)
    ? input.evidence
    : [];

  return {
    contract: 'crm_employer_dashboard',
    version: VERSION,

    account: {
      accountId: account.accountId || null,
      name: account.name || null,
      status: account.status || 'prospect'
    },

    contacts: {
      total: contacts.length,
      active: countState(contacts, 'active')
    },

    opportunities: {
      total: opportunities.length,
      open: countState(opportunities, 'open'),
      qualified: countState(opportunities, 'qualified'),
      proposal: countState(opportunities, 'proposal'),
      won: countState(opportunities, 'won'),
      lost: countState(opportunities, 'lost'),
      closed: countState(opportunities, 'closed')
    },

    jobOrders: {
      total: jobOrders.length,
      draft: countState(jobOrders, 'draft'),
      open: countState(jobOrders, 'open'),
      onHold: countState(jobOrders, 'on_hold'),
      filled: countState(jobOrders, 'filled'),
      cancelled: countState(jobOrders, 'cancelled'),
      closed: countState(jobOrders, 'closed')
    },

    activity: {
      total: activities.length,
      latest: activities.length
        ? activities[activities.length - 1]
        : null
    },

    evidence: {
      total: evidence.length,
      verified: evidence.filter(function (item) {
        return item.verified === true;
      }).length
    },

    boundaries: {
      crmOwnsEmployerRelationship: true,
      staffingOwnsCandidatePlacement: true,
      hrOwnsEmploymentLifecycle: true,
      dashboardWritesState: false
    },

    provenance: {
      source: 'crm_employer_operations',
      version: VERSION
    }
  };
}

module.exports = {
  VERSION: VERSION,
  buildDashboard: buildDashboard
};
