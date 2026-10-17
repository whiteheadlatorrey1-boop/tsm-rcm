'use strict';

const {
  recordCandidateEvidence,
  recordManualCandidateEvidence,
  recordTrainingCompletionEvidence,
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

// Staff-attested manual entry: exam/cert id, date, verifier, evidence URL.
function recordCsaManualAttestation(input, dir) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('CSA candidate evidence input must be an object');
  }
  const result = recordManualCandidateEvidence({
    candidateId: input.candidateId,
    examId: input.examId,
    examDate: input.examDate,
    verifier: input.verifier,
    evidenceUrl: input.evidenceUrl,
    recordedBy: input.recordedBy,
  }, dir);
  return { file: result.file, record: result.record };
}

// Called (by the Workforce side) when a Career Training completion event
// lands for the ServiceNow CSA track. This module stays one-directional --
// it never calls back into the caller that invokes it.
function recordCsaTrainingCompletion(input, dir) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('CSA candidate evidence input must be an object');
  }
  const result = recordTrainingCompletionEvidence({
    candidateId: input.candidateId,
    submissionId: input.submissionId,
    trainingEventType: input.trainingEventType,
  }, dir);
  return { file: result.file, record: result.record };
}

function listCsaCandidateEvidence(candidateId, dir) {
  return listCandidateEvidence(candidateId, dir);
}

module.exports = {
  recordCsaCandidateEvidence,
  recordCsaManualAttestation,
  recordCsaTrainingCompletion,
  listCsaCandidateEvidence,
};
