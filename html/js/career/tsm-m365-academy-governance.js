'use strict';

/*
 * TSM Phase 10H — Academy Governance.
 */

var VERSION = '10H.0';

function validate(contract) {
  var failures = [];
  contract = contract || {};

  if (contract.contract !== 'microsoft_365_academy') {
    failures.push('invalid_contract');
  }

  if (!contract.candidate || !contract.candidate.candidateId) {
    failures.push('candidate_identity_required');
  }

  if (!contract.academy || contract.academy.academyId !== 'microsoft_365_academy') {
    failures.push('academy_identity_required');
  }

  if (!contract.provenance || !contract.provenance.source) {
    failures.push('provenance_required');
  }

  if (!Array.isArray(contract.modules)) {
    failures.push('modules_required');
  }

  if (!Array.isArray(contract.evidenceRefs)) {
    failures.push('evidence_refs_required');
  }

  return {
    valid: failures.length === 0,
    failures: failures,
    controls: {
      candidateLinked: failures.indexOf('candidate_identity_required') === -1,
      provenanceRequired: true,
      evidenceTraceable: failures.indexOf('evidence_refs_required') === -1,
      registryRemainsCanonical: true,
      replacementReadinessScoring: false,
      staffingLifecycleWrites: false
    },
    provenance: {
      governanceVersion: VERSION
    }
  };
}

module.exports = {
  VERSION: VERSION,
  validate: validate
};
