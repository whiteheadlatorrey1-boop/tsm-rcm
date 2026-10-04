'use strict';

/*
 * TSM Phase 10G — Academy Dashboard View Model.
 * UI-facing model only. No DOM mutations.
 */

var VERSION = '10G.0';

function buildDashboard(contract, progress, evidence) {
  contract = contract || {};
  progress = progress || {};
  evidence = evidence || {};

  var total = Number(
    contract.completion &&
    contract.completion.totalModules || 0
  );

  var completed = Number(
    contract.completion &&
    contract.completion.completedModules || 0
  );

  return {
    contract: 'microsoft_365_academy_dashboard',
    version: VERSION,
    candidateId: contract.candidate
      ? contract.candidate.candidateId
      : null,
    academy: contract.academy || {},
    completion: {
      totalModules: total,
      completedModules: completed,
      completionPercent: total
        ? Math.round((completed / total) * 100)
        : 0
    },
    progress: {
      verifiedModules: Number(progress.verifiedModules || 0),
      inProgressModules: Number(progress.inProgressModules || 0)
    },
    evidence: {
      total: Number(evidence.evidenceCount || 0),
      verified: Number(evidence.verifiedEvidenceCount || 0)
    },
    nextAction: completed < total
      ? 'CONTINUE_NEXT_MODULE'
      : 'REVIEW_NEXT_TRACK',
    provenance: {
      source: 'microsoft_365_academy',
      academyContractVersion: contract.version || null
    }
  };
}

module.exports = {
  VERSION: VERSION,
  buildDashboard: buildDashboard
};
