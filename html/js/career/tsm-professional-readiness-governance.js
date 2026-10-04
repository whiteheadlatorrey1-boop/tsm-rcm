'use strict';

/*
 * TSM Phase 9I — Professional Readiness Governance
 *
 * Validates that a readiness contract is explainable,
 * candidate-linked, provenance-aware, and separated from
 * staffing placement evidence.
 */

var VERSION = '9I.0';

var EXCLUDED_KINDS = [
  'staffing_submission',
  'staffing_interview',
  'staffing_offer',
  'staffing_placement',
  'staffing_placement_outcome',
  'staffing_stage_transition',
  'staffing_audit'
];

function validate(contract) {
  var failures = [];

  contract = contract || {};

  if (contract.contract !== 'professional_readiness') {
    failures.push('invalid contract');
  }

  if (!contract.candidateId) {
    failures.push('candidate identity missing');
  }

  if (!contract.provenance) {
    failures.push('provenance missing');
  }

  if (!Array.isArray(contract.evidenceRefs)) {
    failures.push('evidence references missing');
  }

  if (!contract.professionalReadiness) {
    failures.push('professional readiness state missing');
  }

  if (!contract.qualification) {
    failures.push('qualification boundary missing');
  }

  if (
    Array.isArray(contract.evidenceRefs) &&
    contract.evidenceRefs.some(function (item) {
      return item &&
        EXCLUDED_KINDS.indexOf(item.kind) !== -1;
    })
  ) {
    failures.push('staffing placement evidence leaked into readiness');
  }

  var dimensions =
    contract.professionalReadiness &&
    Array.isArray(contract.professionalReadiness.dimensions)
      ? contract.professionalReadiness.dimensions
      : [];

  dimensions.forEach(function (item) {
    if (!item || !item.dimensionId) {
      failures.push('dimension identity missing');
    }

    if (
      item &&
      item.informed !== false &&
      item.score !== null &&
      typeof item.score !== 'number'
    ) {
      failures.push(
        'dimension score must be numeric or null'
      );
    }
  });

  return {
    contract: 'professional_readiness_governance',
    version: VERSION,
    valid: failures.length === 0,
    failures: failures,

    controls: {
      candidateLinked: !!contract.candidateId,
      provenanceRequired: !!contract.provenance,
      explainableDimensions: dimensions.length > 0,
      staffingEvidenceSeparated: !failures.some(function (item) {
        return item ===
          'staffing placement evidence leaked into readiness';
      }),
      qualificationBoundaryPresent:
        !!contract.qualification
    },

    provenance: {
      generatedBy:
        'TSMProfessionalReadinessGovernance'
    }
  };
}

module.exports = {
  VERSION: VERSION,
  EXCLUDED_KINDS: EXCLUDED_KINDS.slice(),
  validate: validate
};
