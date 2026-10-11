'use strict';

const assert = require('assert');
const { validateCandidateEvidence } = require('../server/certification/candidate-evidence-contract');

let passed = 0;
let failed = 0;

function t(name, fn) {
  try { fn(); passed++; console.log('ok   ' + name); }
  catch (e) { failed++; console.log('FAIL ' + name + ': ' + e.message); }
}

const valid = () => ({
  candidateId: 'CAND-100',
  submissionId: 'CSA-SUB-100',
  serverRegraded: true,
  result: {
    sim: { blueprintId: 'servicenow-csa-2026' },
    graded: { simRecord: { score: 85, questions: 60, minutes: 80, unreviewedQuestions: 0 } },
    evidence: [{ domainId: 'incident-management', score: 85 }],
  },
});

t('accepts explicit candidate and submission IDs with reviewed evidence', () => {
  const out = validateCandidateEvidence(valid());
  assert.strictEqual(out.candidateId, 'CAND-100');
  assert.strictEqual(out.qualifiesAsFullSimulation, true);
});

t('rejects missing candidate ID', () => {
  const x = valid(); delete x.candidateId;
  assert.throws(() => validateCandidateEvidence(x), /candidateId/);
});

t('rejects malformed submission ID', () => {
  const x = valid(); x.submissionId = 'bad id';
  assert.throws(() => validateCandidateEvidence(x), /submissionId/);
});

t('retains reviewed domain evidence for the ledger', () => {
  const out = validateCandidateEvidence(valid());
  assert.deepStrictEqual(out.reviewedEvidence, [
    { domainId: 'incident-management', score: 85 },
  ]);
});

t('unreviewed simulation does not qualify as a full simulation', () => {
  const x = valid(); x.result.graded.simRecord.unreviewedQuestions = 1;
  assert.strictEqual(validateCandidateEvidence(x).qualifiesAsFullSimulation, false);
});

t('missing reviewed evidence does not change full-simulation status', () => {
  const x = valid(); x.result.evidence = [];
  assert.strictEqual(validateCandidateEvidence(x).reviewedEvidenceCount, 0);
  assert.strictEqual(validateCandidateEvidence(x).qualifiesAsFullSimulation, true);
});

t('rejects an unexpected blueprint', () => {
  const x = valid();
  x.result.sim.blueprintId = 'unexpected-blueprint';
  assert.throws(
    () => validateCandidateEvidence(x),
    /blueprint/i
  );
});

t('rejects malformed input', () => {
  assert.throws(() => validateCandidateEvidence(null), /object/);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
