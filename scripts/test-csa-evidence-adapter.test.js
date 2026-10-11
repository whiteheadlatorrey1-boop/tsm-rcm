'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const adapter = require('../server/certification/candidate-evidence-adapter');
const ledger = require('../server/certification/candidate-evidence-ledger');
const { loadBank } = require('../server/certification/question-bank');
const { buildSimulation } = require('../server/certification/simulation');

let passed = 0;
let failed = 0;
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'csa-adapter-test-'));
const bank = loadBank('servicenow-csa-2026');

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('PASS ' + name);
  } catch (err) {
    failed++;
    console.error('FAIL ' + name + ': ' + err.message);
  }
}

function fixture(seed = 43127) {
  const sim = buildSimulation('servicenow-csa-2026', bank, { seed });
  const answers = {};
  for (const item of sim.items) {
    answers[item.qid] = item.correct;
  }
  return {
    v: 1,
    blueprintId: 'servicenow-csa-2026',
    seed,
    minutes: 60,
    answers,
  };
}

function dir(name) {
  const p = path.join(root, name);
  fs.mkdirSync(p, { recursive: true });
  return p;
}

test('exports record and list functions', () => {
  assert.strictEqual(typeof adapter.recordCsaCandidateEvidence, 'function');
  assert.strictEqual(typeof adapter.listCsaCandidateEvidence, 'function');
});

test('rejects null input', () => {
  assert.throws(() => adapter.recordCsaCandidateEvidence(null, dir('null')), /input must be an object/);
});

test('rejects array input', () => {
  assert.throws(() => adapter.recordCsaCandidateEvidence([], dir('array')), /input must be an object/);
});

test('rejects missing candidate ID', () => {
  assert.throws(() => adapter.recordCsaCandidateEvidence({
    submissionId: 'sub-1', record: fixture(),
  }, dir('missing-candidate')), /candidateId/);
});

test('rejects malformed submission ID', () => {
  assert.throws(() => adapter.recordCsaCandidateEvidence({
    candidateId: 'candidate-1', submissionId: 'bad id', record: fixture(),
  }, dir('bad-submission')), /submissionId/);
});

test('rejects missing raw record', () => {
  assert.throws(() => adapter.recordCsaCandidateEvidence({
    candidateId: 'candidate-1', submissionId: 'sub-1',
  }, dir('missing-record')));
});

test('rejects caller-asserted result without raw record', () => {
  assert.throws(() => adapter.recordCsaCandidateEvidence({
    candidateId: 'candidate-1',
    submissionId: 'sub-2',
    result: { score: 100 },
  }, dir('asserted-result')));
});

test('records a raw CSA simulation through the ledger', () => {
  const out = adapter.recordCsaCandidateEvidence({
    candidateId: 'candidate-1', submissionId: 'sub-3', record: fixture(43128),
  }, dir('record'));
  assert.ok(out.file);
  assert.strictEqual(out.record.candidateId, 'candidate-1');
  assert.strictEqual(out.record.submissionId, 'sub-3');
  assert.strictEqual(out.record.blueprintId, 'servicenow-csa-2026');
  assert.ok(Number.isFinite(out.record.score));
});

test('ledger regrades rather than trusting a supplied score', () => {
  const out = adapter.recordCsaCandidateEvidence({
    candidateId: 'candidate-2', submissionId: 'sub-4',
    record: { ...fixture(43129), score: 0 },
  }, dir('regrade'));
  assert.ok(out.record.score > 0);
});

test('rejects duplicate candidate/submission pair', () => {
  const target = dir('duplicate');
  const input = {
    candidateId: 'candidate-3', submissionId: 'same-sub', record: fixture(43130),
  };
  adapter.recordCsaCandidateEvidence(input, target);
  assert.throws(() => adapter.recordCsaCandidateEvidence(input, target), /already recorded/);
});

test('allows the same submission ID for different candidates', () => {
  const target = dir('different-candidates');
  const record = fixture(43131);
  adapter.recordCsaCandidateEvidence({
    candidateId: 'candidate-a', submissionId: 'shared-sub', record,
  }, target);
  const second = adapter.recordCsaCandidateEvidence({
    candidateId: 'candidate-b', submissionId: 'shared-sub', record,
  }, target);
  assert.strictEqual(second.record.candidateId, 'candidate-b');
});

test('lists only the requested candidate evidence', () => {
  const target = dir('list-isolation');
  const record = fixture(43132);
  adapter.recordCsaCandidateEvidence({
    candidateId: 'candidate-x', submissionId: 'sub-x', record,
  }, target);
  adapter.recordCsaCandidateEvidence({
    candidateId: 'candidate-y', submissionId: 'sub-y', record,
  }, target);
  const rows = adapter.listCsaCandidateEvidence('candidate-x', target);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].candidateId, 'candidate-x');
});

test('returns an empty list for a missing ledger directory', () => {
  assert.deepStrictEqual(
    adapter.listCsaCandidateEvidence('candidate-empty', path.join(root, 'does-not-exist')),
    []
  );
});

test('does not write candidate registry training events', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../server/certification/candidate-evidence-adapter.js'), 'utf8'
  );
  assert.ok(!source.includes('candidate-registry-service'));
  assert.ok(!source.includes('recordTrainingEvent'));
});

console.log(`\n# pass ${passed}`);
console.log(`# fail ${failed}`);
fs.rmSync(root, { recursive: true, force: true });
if (failed) process.exit(1);
