'use strict';

/*
 * TSM Phase 12I — CRM / Staffing / HR Boundary.
 */

var VERSION = '12I.0';

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function buildBoundary(accountId) {
  return {
    accountId: clean(accountId),

    crm: {
      ownsEmployerRelationship: true,
      ownsAccounts: true,
      ownsContacts: true,
      ownsOpportunities: true,
      ownsJobOrders: true,
      ownsEmployerActivities: true
    },

    staffing: {
      ownsCandidateMatching: true,
      ownsSubmissionLifecycle: true,
      ownsPlacementLifecycle: true
    },

    hr: {
      ownsEmploymentLifecycle: true,
      ownsOnboarding: true,
      ownsOffboarding: true,
      ownsHrCases: true
    },

    candidateRegistry: {
      remainsCanonicalForCandidateIdentity: true
    },

    controls: {
      crmDoesNotRewriteCandidateReadiness: true,
      crmDoesNotRewriteStaffingPlacement: true,
      crmDoesNotRewriteHrEmploymentState: true,
      staffingDoesNotBecomeCrm: true,
      hrDoesNotBecomeCrm: true
    },

    handoffs: {
      jobOrderToStaffing: true,
      placementToHr: true
    },

    provenance: {
      source: 'crm_employer_operations',
      version: VERSION
    }
  };
}

module.exports = {
  VERSION: VERSION,
  buildBoundary: buildBoundary
};
