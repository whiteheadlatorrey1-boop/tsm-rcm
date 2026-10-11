'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseRecord, regrade } = require('./sim-record');
const { loadBank } = require('./question-bank');
const { getWeightedBlueprint } = require('./weighted-blueprints');
const { qualifiesAsFullCsaSimulation } = require('./csa-full-simulation-gate');

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function ledgerDir() {
  return process.env.CSA_CANDIDATE_EVIDENCE_DIR ||
    path.join(require('os').homedir(), 'csa-candidate-evidence');
}

function recordCandidateEvidence(input, dir) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('candidate evidence input must be an object');
  }
  if (typeof input.candidateId !== 'string' || !ID_RE.test(input.candidateId)) {
    throw new Error('valid candidateId is required');
  }
  if (typeof input.submissionId !== 'string' || !ID_RE.test(input.submissionId)) {
    throw new Error('valid submissionId is required');
  }

  // Accept the raw simulation record, never a caller-asserted grading result.
  const record = parseRecord(JSON.stringify(input.record));
  if (record.blueprintId !== 'servicenow-csa-2026') {
    throw new Error('unexpected blueprint ' + record.blueprintId);
  }
  getWeightedBlueprint(record.blueprintId);
  const result = regrade(record, loadBank(record.blueprintId));

  const sim = result.graded.simRecord;
  const reviewedEvidence = result.evidence.filter((row) =>
    row &&
    typeof row.domainId === 'string' &&
    Number.isFinite(row.score) &&
    row.score >= 0 &&
    row.score <= 100
  );

  if (
    !Number.isFinite(sim.score) ||
    sim.questions < 1 ||
    sim.minutes <= 0 ||
    sim.unreviewedQuestions !== 0
  ) {
    throw new Error('run does not qualify as a full simulation');
  }
  if (!reviewedEvidence.length) {
    throw new Error('at least one reviewed domain evidence row is required');
  }

  const root = dir || ledgerDir();
  fs.mkdirSync(root, { recursive: true });

  const key = crypto.createHash('sha256')
    .update(input.candidateId + '\0' + input.submissionId)
    .digest('hex');
  const file = path.join(root, key + '.json');

  const body = {
    candidateId: input.candidateId,
    submissionId: input.submissionId,
    blueprintId: record.blueprintId,
    seed: record.seed,
    score: sim.score,
    qualifiesAsFullSimulation: qualifiesAsFullCsaSimulation({ ...sim, blueprintId: record.blueprintId }),
    reviewedEvidenceCount: reviewedEvidence.length,
    reviewedEvidence: reviewedEvidence.map((row) => ({
      domainId: row.domainId,
      score: row.score,
    })),
    recordedAt: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(file, JSON.stringify(body, null, 2) + '\n', {
      flag: 'wx',
      mode: 0o600,
    });
  } catch (e) {
    if (e.code === 'EEXIST') {
      throw new Error('candidate submission was already recorded');
    }
    throw e;
  }
  return { file, record: body };
}

function listCandidateEvidence(candidateId, dir) {
  if (typeof candidateId !== 'string' || !ID_RE.test(candidateId)) {
    throw new Error('valid candidateId is required');
  }
  const root = dir || ledgerDir();
  if (!fs.existsSync(root)) return [];
  const rows = [];
  for (const name of fs.readdirSync(root).filter((n) => /^[a-f0-9]{64}\.json$/.test(n))) {
    let row;
    try {
      row = JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
    } catch (e) {
      throw new Error('corrupt candidate evidence ledger file ' + name + ': invalid JSON');
    }
    if (!row || typeof row !== 'object' || Array.isArray(row) ||
        typeof row.candidateId !== 'string' ||
        typeof row.submissionId !== 'string' ||
        typeof row.recordedAt !== 'string') {
      throw new Error('corrupt candidate evidence ledger file ' + name + ': invalid record shape');
    }
    rows.push(row);
  }
  return rows
    .filter((row) => row.candidateId === candidateId)
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
}

module.exports = { ledgerDir, recordCandidateEvidence, listCandidateEvidence };
