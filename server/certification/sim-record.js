'use strict';
// Turns the record command from the simulation page into stored, officially graded results.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildSimulation, gradeSimulation } = require('./simulation');
const { evaluateWeightedReadiness } = require('./weighted-gate');

// Results live outside the repo so the working tree stays clean.
function resultsDir() { return process.env.CSA_RESULTS_DIR || path.join(os.homedir(), 'csa-results'); }

function parseRecord(text) {
  let r;
  try { r = JSON.parse(String(text || '').trim()); } catch (e) { throw new Error('record is not valid JSON'); }
  if (!r || r.v !== 1) throw new Error('unsupported record version');
  if (typeof r.blueprintId !== 'string') throw new Error('record has no blueprintId');
  if (!Number.isInteger(r.seed) || r.seed < 0 || r.seed > 4294967295) throw new Error('bad seed');
  if (!Number.isFinite(r.minutes) || r.minutes <= 0) throw new Error('bad minutes');
  if (!r.answers || typeof r.answers !== 'object' || Array.isArray(r.answers)) throw new Error('bad answers');
  return r;
}

// Rebuilds the exact simulation from the seed and grades it with the official grader.
// Evidence rows are kept only for reviewed questions, so unreviewed keys never feed the gate.
function regrade(record, bank) {
  const sim = buildSimulation(record.blueprintId, bank, { seed: record.seed });
  const known = new Set(sim.items.map((i) => i.qid));
  Object.keys(record.answers).forEach((k) => {
    if (!known.has(k)) throw new Error('answer for a question that is not in this simulation: ' + k + ' (did the question bank change after the page was generated?)');
  });
  const graded = gradeSimulation(sim, record.answers, record.minutes);
  const evidence = graded.domainEvidence.filter((_, i) => sim.items[i].reviewed);
  return { sim, graded, evidence };
}

function storeResult(record, r, dir) {
  const d = dir || resultsDir();
  fs.mkdirSync(d, { recursive: true });
  const file = path.join(d, 'run-' + record.seed + '.json');
  const body = {
    seed: record.seed, blueprintId: record.blueprintId, recordedAt: new Date().toISOString(),
    minutes: record.minutes, score: r.graded.score, correct: r.graded.correct, total: r.graded.total,
    unreviewedQuestions: r.graded.simRecord.unreviewedQuestions,
    sim: r.graded.simRecord, evidence: r.evidence,
  };
  try { fs.writeFileSync(file, JSON.stringify(body, null, 1) + '\n', { flag: 'wx' }); }
  catch (e) { if (e.code === 'EEXIST') throw new Error('run ' + record.seed + ' was already recorded'); throw e; }
  return file;
}

function loadResults(blueprintId, dir) {
  const d = dir || resultsDir();
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((f) => /^run-\d+\.json$/.test(f)).sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')))
    .filter((r) => r.blueprintId === blueprintId)
    .sort((a, b) => (a.recordedAt < b.recordedAt ? -1 : a.recordedAt > b.recordedAt ? 1 : a.seed - b.seed));
}

function readinessFromResults(blueprintId, results) {
  return evaluateWeightedReadiness(blueprintId, results.flatMap((r) => r.evidence), results.map((r) => r.sim));
}

module.exports = { resultsDir, parseRecord, regrade, storeResult, loadResults, readinessFromResults };
