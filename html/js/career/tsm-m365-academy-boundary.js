'use strict';

/*
 * TSM Phase 10I — Academy boundary adapters.
 *
 * Academy contributes evidence.
 * Professional Readiness owns readiness interpretation.
 * Staffing owns placement lifecycle.
 */

var VERSION = '10I.0';

function toProfessionalReadinessInput(contract, evidence) {
  contract = contract || {};
  evidence = evidence || {};

  return {
    candidateId: contract.candidate
      ? contract.candidate.candidateId
      : null,
    source: 'microsoft_365_academy',
    evidenceRefs: Array.isArray(evidence.evidence)
      ? evidence.evidence.map(function (item) {
          return item.evidenceId;
        })
      : [],
    competencyEvidence: Array.isArray(evidence.evidence)
      ? evidence.evidence
      : [],
    replacementScoring: false,
    registryWrite: false
  };
}

function staffingBoundary(contract) {
  contract = contract || {};

  return {
    candidateId: contract.candidate
      ? contract.candidate.candidateId
      : null,
    academyCanContributeEvidence: true,
    academyOwnsPlacementLifecycle: false,
    academyWritesPlacementState: false,
    staffingOwnsPlacementLifecycle: true,
    professionalReadinessOwnsQualification: true
  };
}

module.exports = {
  VERSION: VERSION,
  toProfessionalReadinessInput: toProfessionalReadinessInput,
  staffingBoundary: staffingBoundary
};
