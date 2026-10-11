'use strict';

const {
  recordCandidateEvidence,
  listCandidateEvidence,
} = require('./candidate-evidence-ledger');

function recordCsaCandidateEvidence(input, dir) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('CSA candidate evidence input must be an object');
  }

  // The ledger validates IDs, parses the raw record, and regrades server-side.
  const result = recordCandidateEvidence({
    candidateId: input.candidateId,
    submissionId: input.submissionId,
    record: input.record,
  }, dir);

  return {
    file: result.file,
    record: result.record,
  };
}

function listCsaCandidateEvidence(candidateId, dir) {
  return listCandidateEvidence(candidateId, dir);
}

module.exports = {
  recordCsaCandidateEvidence,
  listCsaCandidateEvidence,
};
