'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  recordCandidateEvidence,
  listCandidateEvidence,
} = require('../server/certification/candidate-evidence-ledger');
const { loadBank } = require('../server/certification/question-bank');
const { getWeightedBlueprint } = require('../server/certification/weighted-blueprints');
const { buildSimulation } = require('../server/certification/simulation');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'csa-evidence-ledger-'));
const id = 'servicenow-csa-2026';
const bp = getWeightedBlueprint(id);
const bank = loadBank(id);
const sim = buildSimulation(id, bank, { seed: 123456 });

const input = {
  candidateId: 'CAND-100',
  submissionId: 'CSA-SUB-100',
  record: {
    v: 1,
    blueprintId: id,
    seed: 123456,
    minutes: bp.exam.minutes,
    answers: Object.fromEntries(sim.items.map(item => [item.qid, item.correct])),
  },
};

let passed = 0;
let failed = 0;

function t(name, fn) {
  try {
    fn();
    passed++;
    console.log('ok   ' + name);
  } catch (e) {
    failed++;
    console.log('FAIL ' + name + ': ' + e.message);
  }
}

t('regrades raw record and records reviewed evidence', () => {
  const out = recordCandidateEvidence(input, dir);
  assert.strictEqual(out.record.candidateId, 'CAND-100');
  assert.strictEqual(out.record.blueprintId, id);
  assert.strictEqual(out.record.qualifiesAsFullSimulation, true);
  assert(out.record.reviewedEvidenceCount > 0);
  assert.strictEqual(listCandidateEvidence('CAND-100', dir).length, 1);
});

t('rejects duplicate candidate and submission pair', () => {
  assert.throws(() => recordCandidateEvidence(input, dir), /already recorded/);
  assert.strictEqual(listCandidateEvidence('CAND-100', dir).length, 1);
});

t('rejects caller-supplied grading results without a raw record', () => {
  const x = {
    candidateId: 'CAND-300',
    submissionId: 'CSA-SUB-FABRICATED',
    result: {
      sim: { blueprintId: id },
      graded: { simRecord: { score: 100, questions: 60, minutes: 1, unreviewedQuestions: 0 } },
      evidence: [{ domainId: 'platform-nav', score: 100 }],
    },
  };
  assert.throws(() => recordCandidateEvidence(x, dir), /record|version|blueprintId/i);
  assert.strictEqual(listCandidateEvidence('CAND-300', dir).length, 0);
});

t('rejects a record with an invalid seed', () => {
  const x = JSON.parse(JSON.stringify(input));
  x.submissionId = 'CSA-SUB-BAD-SEED';
  x.record.seed = -1;
  assert.throws(() => recordCandidateEvidence(x, dir), /seed/);
});

t('rejects answers for questions outside the seeded simulation', () => {
  const x = JSON.parse(JSON.stringify(input));
  x.submissionId = 'CSA-SUB-UNKNOWN-Q';
  x.record.answers = { NOT_A_REAL_QUESTION: [0] };
  assert.throws(() => recordCandidateEvidence(x, dir), /not in this simulation/);
});

t('fails closed on a corrupt ledger JSON file', () => {
  const corruptDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csa-evidence-corrupt-'));
  try {
    fs.writeFileSync(path.join(corruptDir, 'a'.repeat(64) + '.json'), '{not-json');
    assert.throws(
      () => listCandidateEvidence('CAND-CORRUPT', corruptDir),
      /corrupt candidate evidence ledger file .*invalid JSON/
    );
  } finally {
    fs.rmSync(corruptDir, { recursive: true, force: true });
  }
});

t('fails closed on a ledger record with an invalid shape', () => {
  const corruptDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csa-evidence-shape-'));
  try {
    fs.writeFileSync(
      path.join(corruptDir, 'b'.repeat(64) + '.json'),
      JSON.stringify({ candidateId: 'CAND-BAD' })
    );
    assert.throws(
      () => listCandidateEvidence('CAND-BAD', corruptDir),
      /corrupt candidate evidence ledger file .*invalid record shape/
    );
  } finally {
    fs.rmSync(corruptDir, { recursive: true, force: true });
  }
});

t('allows the same submission ID for different candidates', () => {
  const x = JSON.parse(JSON.stringify(input));
  x.candidateId = 'CAND-400';
  x.submissionId = 'CSA-SUB-SHARED';
  recordCandidateEvidence(x, dir);

  const y = JSON.parse(JSON.stringify(input));
  y.candidateId = 'CAND-500';
  y.submissionId = 'CSA-SUB-SHARED';
  recordCandidateEvidence(y, dir);

  assert.strictEqual(listCandidateEvidence('CAND-400', dir).length, 1);
  assert.strictEqual(listCandidateEvidence('CAND-500', dir).length, 1);
});

t('isolates evidence by candidate', () => {
  const x = JSON.parse(JSON.stringify(input));
  x.candidateId = 'CAND-200';
  x.submissionId = 'CSA-SUB-200';
  recordCandidateEvidence(x, dir);
  assert.strictEqual(listCandidateEvidence('CAND-100', dir).length, 1);
  assert.strictEqual(listCandidateEvidence('CAND-200', dir).length, 1);
});

fs.rmSync(dir, { recursive: true, force: true });

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
