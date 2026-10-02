'use strict';

/*
 * TSM Phase 9H — Staffing Qualification Boundary
 *
 * Produces the stable qualification object consumed by staffing.
 * Does NOT alter Phase 8 transitions.
 */

var VERSION = '9H.0';

function qualify(contract) {
  contract = contract || {};

  var qualification = contract.qualification || {};

  return {
    contract: 'professional_readiness_staffing_qualification',
    version: VERSION,

    candidateId: contract.candidateId || null,

    targetRole: contract.targetRole || {
      roleId: null,
      roleName: null
    },

    qualified: qualification.qualified === true,

    readinessScore:
      typeof qualification.readinessScore === 'number'
        ? qualification.readinessScore
        : null,

    gapCount:
      typeof qualification.gapCount === 'number'
        ? qualification.gapCount
        : 0,

    qualificationContract:
      qualification.contract ||
      'professional_readiness_qualification',

    boundary: {
      staffingOwnsPlacementLifecycle: true,
      staffingOwnsStageTransitions: true,
      readinessDoesNotWritePlacementState: true
    },

    provenance: {
      generatedBy:
        'TSMProfessionalReadinessStaffingBoundary'
    }
  };
}

module.exports = {
  VERSION: VERSION,
  qualify: qualify
};
