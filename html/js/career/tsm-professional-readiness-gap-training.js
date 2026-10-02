'use strict';

/*
 * TSM Phase 9F — Gap-to-Training
 *
 * Converts explainable readiness gaps into deterministic
 * TRAIN -> PRACTICE -> VERIFY actions.
 */

var VERSION = '9F.0';

function buildPlan(contract) {
  contract = contract || {};

  var actions = Array.isArray(contract.trainingActions)
    ? contract.trainingActions
    : [];

  return {
    contract: 'professional_readiness_training_plan',
    version: VERSION,
    candidateId: contract.candidateId || null,

    actions: actions.map(function (action) {
      return {
        actionId: action.actionId,
        dimensionId: action.dimensionId,
        sequence: ['TRAIN', 'PRACTICE', 'VERIFY'],
        reason: action.reason || null,
        evidenceRequired: true,
        status: 'recommended'
      };
    }),

    provenance: {
      generatedBy:
        'TSMProfessionalReadinessGapTraining'
    }
  };
}

module.exports = {
  VERSION: VERSION,
  buildPlan: buildPlan
};
