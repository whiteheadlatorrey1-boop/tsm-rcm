'use strict';

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function validateCandidateEvidence(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('candidate evidence input must be an object');
  }
  if (typeof input.candidateId !== 'string' || !ID_RE.test(input.candidateId)) {
    throw new Error('valid candidateId is required');
  }
  if (typeof input.submissionId !== 'string' || !ID_RE.test(input.submissionId)) {
    throw new Error('valid submissionId is required');
  }
  const result = input.result;
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('regraded result is required');
  }
  const sim = result.graded && result.graded.simRecord;
  if (!sim || typeof sim !== 'object') {
    throw new Error('server simulation record is required');
  }
  if (!result.sim || result.sim.blueprintId !== 'servicenow-csa-2026') {
    throw new Error('unexpected blueprint ' + (result.sim && result.sim.blueprintId));
  }

  const evidence = Array.isArray(result.evidence) ? result.evidence : [];
  const reviewedEvidence = evidence.filter((row) =>
    row &&
    typeof row.domainId === 'string' &&
    typeof row.score === 'number' &&
    Number.isFinite(row.score) &&
    row.score >= 0 &&
    row.score <= 100
  );

  const fullSimulation =
    typeof sim.score === 'number' &&
    Number.isFinite(sim.score) &&
    sim.questions >= 1 &&
    sim.minutes > 0 &&
    sim.unreviewedQuestions === 0;

  return {
    candidateId: input.candidateId,
    submissionId: input.submissionId,
    blueprintId: result.sim && result.sim.blueprintId,
    score: sim.score,
    fullSimulation,
    reviewedEvidenceCount: reviewedEvidence.length,
    reviewedEvidence: reviewedEvidence.map((row) => ({
      domainId: row.domainId,
      score: row.score,
    })),
    qualifiesAsFullSimulation: fullSimulation,
  };
}

module.exports = { validateCandidateEvidence };
