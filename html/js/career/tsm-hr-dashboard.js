'use strict';

/*
 * TSM Phase 11H — HR Operations Dashboard View Model.
 *
 * UI-facing model only.
 */

var VERSION = '11H.0';

function countByState(records, state) {
  return (Array.isArray(records) ? records : []).filter(function (item) {
    return item.state === state;
  }).length;
}

function buildDashboard(input) {
  input = input || {};

  var lifecycle = input.lifecycle || {};
  var onboarding = input.onboarding || null;
  var offboarding = input.offboarding || null;
  var cases = Array.isArray(input.cases) ? input.cases : [];
  var compliance = Array.isArray(input.complianceEvidence)
    ? input.complianceEvidence
    : [];

  return {
    contract: 'hr_operations_dashboard',
    version: VERSION,
    workerId: lifecycle.workerId || null,
    employmentState: lifecycle.state || 'prehire',
    onboarding: onboarding || {
      total: 0,
      completed: 0,
      remaining: 0,
      completionPercent: 0
    },
    offboarding: offboarding || {
      total: 0,
      completed: 0,
      remaining: 0,
      completionPercent: 0
    },
    cases: {
      total: cases.length,
      open: countByState(cases, 'open'),
      inProgress: countByState(cases, 'in_progress'),
      pending: countByState(cases, 'pending'),
      resolved: countByState(cases, 'resolved'),
      closed: countByState(cases, 'closed')
    },
    compliance: {
      total: compliance.length,
      verified: compliance.filter(function (item) {
        return item.verified === true;
      }).length
    },
    boundaries: {
      staffingOwnsPlacement: true,
      hrOwnsEmploymentLifecycle: true,
      dashboardWritesState: false
    },
    provenance: {
      source: 'hr_operations',
      version: VERSION
    }
  };
}

module.exports = {
  VERSION: VERSION,
  buildDashboard: buildDashboard
};
