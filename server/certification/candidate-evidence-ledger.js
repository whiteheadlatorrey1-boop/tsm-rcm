'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseRecord, regrade } = require('./sim-record');
const { loadBank } = require('./question-bank');
const { getWeightedBlueprint } = require('./weighted-blueprints');
const { qualifiesAsFullCsaSimulation } = require('./csa-full-simulation-gate');

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

// Fly Volume convention (matches server/l1-copilot/audit-store.js and
// analyze-job-store.js): production writes must land under the mounted
// volume at /app/data, not a homedir path, or they're lost on redeploy.
function ledgerDir() {
  if (process.env.CSA_CANDIDATE_EVIDENCE_DIR) return process.env.CSA_CANDIDATE_EVIDENCE_DIR;
  return process.env.NODE_ENV === 'production'
    ? '/app/data/csa-candidate-evidence'
    : path.join(__dirname, '..', '..', 'data', 'csa-candidate-evidence');
}

// Shared exclusive-create write used by both evidence kinds below --
// append-only (EEXIST on a duplicate submissionId), same convention as
// recordCandidateEvidence's own write.
function writeLedgerRecord(dir, candidateId, submissionId, fields) {
  const root = dir || ledgerDir();
  fs.mkdirSync(root, { recursive: true });

  const key = crypto.createHash('sha256')
    .update(candidateId + '\0' + submissionId)
    .digest('hex');
  const file = path.join(root, key + '.json');

  const body = {
    candidateId,
    submissionId,
    ...fields,
    recordedAt: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(file, JSON.stringify(body, null, 2) + '\n', {
      flag: 'wx',
      mode: 0o600,
    });
  } catch (e) {
    if (e.code === 'EEXIST') {
      throw new Error('this evidence record was already recorded');
    }
    throw e;
  }
  return { file, record: body };
}

const EXAM_ID_RE = ID_RE;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Staff-attested manual ledger entry: exam/cert id, date, verifier, optional
// evidence URL. Distinct from recordCandidateEvidence (a raw simulation
// run, regraded server-side) -- this is a human attestation, so it carries
// no sim-record/grading shape at all, just who-verified-what-when.
function recordManualCandidateEvidence(input, dir) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('candidate evidence input must be an object');
  }
  if (typeof input.candidateId !== 'string' || !ID_RE.test(input.candidateId)) {
    throw new Error('valid candidateId is required');
  }
  if (typeof input.examId !== 'string' || !EXAM_ID_RE.test(input.examId)) {
    throw new Error('valid examId is required');
  }
  if (typeof input.examDate !== 'string' || !DATE_RE.test(input.examDate) || Number.isNaN(Date.parse(input.examDate))) {
    throw new Error('valid examDate (YYYY-MM-DD) is required');
  }
  if (typeof input.verifier !== 'string' || !input.verifier.trim()) {
    throw new Error('verifier is required');
  }
  if (typeof input.recordedBy !== 'string' || !input.recordedBy.trim()) {
    throw new Error('recordedBy is required');
  }

  let evidenceUrl = null;
  if (input.evidenceUrl !== undefined && input.evidenceUrl !== null && input.evidenceUrl !== '') {
    if (typeof input.evidenceUrl !== 'string') throw new Error('evidenceUrl must be a string');
    let parsed;
    try {
      parsed = new URL(input.evidenceUrl);
    } catch (e) {
      throw new Error('evidenceUrl must be a valid URL');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('evidenceUrl must be http(s)');
    }
    evidenceUrl = input.evidenceUrl;
  }

  const submissionId = 'manual-' + input.examId;
  return writeLedgerRecord(dir, input.candidateId, submissionId, {
    kind: 'manual_attestation',
    examId: input.examId,
    examDate: input.examDate,
    verifier: input.verifier.trim(),
    evidenceUrl,
    recordedBy: input.recordedBy.trim(),
  });
}

// Automatic ledger entry written when a Career Training completion event
// is recorded for the ServiceNow CSA track (see
// candidate-registry-service.js's recordTrainingEvent). submissionId is
// derived from the training event's own Mongo _id, so re-processing the
// same event is naturally idempotent (EEXIST) rather than double-recording.
function recordTrainingCompletionEvidence(input, dir) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('candidate evidence input must be an object');
  }
  if (typeof input.candidateId !== 'string' || !ID_RE.test(input.candidateId)) {
    throw new Error('valid candidateId is required');
  }
  if (typeof input.submissionId !== 'string' || !ID_RE.test(input.submissionId)) {
    throw new Error('valid submissionId is required');
  }
  if (typeof input.trainingEventType !== 'string' || !input.trainingEventType.trim()) {
    throw new Error('trainingEventType is required');
  }

  return writeLedgerRecord(dir, input.candidateId, input.submissionId, {
    kind: 'training_completion',
    trainingEventType: input.trainingEventType,
  });
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

module.exports = {
  ledgerDir,
  recordCandidateEvidence,
  recordManualCandidateEvidence,
  recordTrainingCompletionEvidence,
  listCandidateEvidence,
};
