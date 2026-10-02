'use strict';

/*
 * TSM Phase 9D — Explainable Professional Readiness
 *
 * Converts the stable 9A contract into an explainable state.
 * Does not replace readiness scoring.
 */

var VERSION = '9D.0';

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function buildExplanation(contract) {
  contract = contract || {};

  var readiness = contract.professionalReadiness || {};
  var dimensions = Array.isArray(readiness.dimensions)
    ? readiness.dimensions
    : [];

  var strengths = [];
  var gaps = [];
  var uninformed = [];

  dimensions.forEach(function (item) {
    if (!item || !item.dimensionId) return;

    if (item.informed === false) {
      uninformed.push(item.dimensionId);
      return;
    }

    if (item.gap === true) {
      gaps.push({
        dimensionId: item.dimensionId,
        score: item.score,
        reason: 'Below readiness gap threshold'
      });
      return;
    }

    if (typeof item.score === 'number') {
      strengths.push({
        dimensionId: item.dimensionId,
        score: item.score
      });
    }
  });

  return {
    contract: 'professional_readiness_explanation',
    version: VERSION,
    candidateId: clean(contract.candidateId) || null,
    roleId:
      contract.targetRole &&
      clean(contract.targetRole.roleId) || null,

    state: readiness.state || 'not_started',
    readinessScore:
      typeof readiness.readinessScore === 'number'
        ? readiness.readinessScore
        : null,

    strengths: strengths,
    gaps: gaps,
    uninformedDimensions: uninformed,

    evidenceCount:
      contract.provenance &&
      contract.provenance.evidenceCount || 0,

    verifiedEvidenceCount:
      contract.provenance &&
      contract.provenance.verifiedEvidenceCount || 0,

    trainingActions:
      Array.isArray(contract.trainingActions)
        ? contract.trainingActions
        : [],

    explanation: gaps.length
      ? 'Readiness is developing because one or more informed dimensions are below the configured gap threshold.'
      : strengths.length
        ? 'Readiness is supported by informed dimensions with no detected dimension gaps.'
        : 'Readiness has not yet been sufficiently evidenced.',

    provenance: {
      generatedBy: 'TSMProfessionalReadinessExplainable'
    }
  };
}

module.exports = {
  VERSION: VERSION,
  buildExplanation: buildExplanation
};
