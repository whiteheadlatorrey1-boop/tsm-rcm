'use strict';

/*
 * TSM Phase 9G — Interview Readiness Integration
 *
 * Adapter only. Existing Interview Prep remains authoritative
 * for interview content and scoring.
 */

var VERSION = '9G.0';

function buildContext(contract) {
  contract = contract || {};

  var interview = contract.interviewReadiness || {};
  var gaps =
    contract.professionalReadiness &&
    Array.isArray(contract.professionalReadiness.dimensions)
      ? contract.professionalReadiness.dimensions.filter(function (item) {
          return item && item.gap === true;
        })
      : [];

  return {
    contract: 'professional_readiness_interview_context',
    version: VERSION,

    candidateId: contract.candidateId || null,

    targetRole: contract.targetRole || {
      roleId: null,
      roleName: null
    },

    interviewReadiness: {
      status: interview.status || 'not_started',
      evidenceCount: interview.evidenceCount || 0
    },

    readinessGaps: gaps.map(function (item) {
      return {
        dimensionId: item.dimensionId,
        score: item.score
      };
    }),

    suggestedFocusDimensions:
      gaps.map(function (item) {
        return item.dimensionId;
      }),

    boundary: {
      existingInterviewPrepRemainsAuthoritative: true,
      replacementScoring: false
    },

    provenance: {
      generatedBy:
        'TSMProfessionalReadinessInterviewContext'
    }
  };
}

module.exports = {
  VERSION: VERSION,
  buildContext: buildContext
};
