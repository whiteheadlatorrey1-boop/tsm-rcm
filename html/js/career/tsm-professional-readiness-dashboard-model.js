'use strict';

/*
 * TSM Phase 9E — Professional Readiness Dashboard Model
 *
 * UI-facing view model only.
 * No DOM mutation and no persistence.
 */

var VERSION = '9E.0';

function buildDashboard(contract, explanation) {
  contract = contract || {};
  explanation = explanation || {};

  var readiness = contract.professionalReadiness || {};
  var role = contract.targetRole || {};

  return {
    contract: 'professional_readiness_dashboard',
    version: VERSION,

    candidate: {
      candidateId: contract.candidateId || null,
      roleId: role.roleId || null,
      roleName: role.roleName || null
    },

    readiness: {
      state: readiness.state || 'not_started',
      score:
        typeof readiness.readinessScore === 'number'
          ? readiness.readinessScore
          : null,
      gapThreshold:
        typeof readiness.gapThreshold === 'number'
          ? readiness.gapThreshold
          : 70
    },

    evidence: {
      total: explanation.evidenceCount || 0,
      verified: explanation.verifiedEvidenceCount || 0,
      coverage:
        Array.isArray(readiness.dimensions)
          ? readiness.dimensions.filter(function (item) {
              return item && item.informed === true;
            }).length
          : 0
    },

    strengths: Array.isArray(explanation.strengths)
      ? explanation.strengths
      : [],

    gaps: Array.isArray(explanation.gaps)
      ? explanation.gaps
      : [],

    nextActions: Array.isArray(contract.trainingActions)
      ? contract.trainingActions
      : [],

    qualification:
      contract.qualification || {
        qualified: false
      },

    provenance: {
      generatedBy:
        'TSMProfessionalReadinessDashboardModel'
    }
  };
}

module.exports = {
  VERSION: VERSION,
  buildDashboard: buildDashboard
};
