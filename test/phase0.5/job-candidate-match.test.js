'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, '../../html/js/career');
const file = path.join(base, 'tsm-job-candidate-match.js');
const Match = require(file);
const Norm = require(path.join(base, 'tsm-job-requirement-normalizer.js'));
const Cand = require(path.join(base, 'tsm-candidate-match-input.js'));

function deepFreeze(o) {
  Object.keys(o).forEach(k => { if (o[k] && typeof o[k] === 'object') deepFreeze(o[k]); });
  return Object.freeze(o);
}
function allKeys(o, acc) {
  acc = acc || [];
  if (o && typeof o === 'object') Object.keys(o).forEach(k => { acc.push(k); allKeys(o[k], acc); });
  return acc;
}

const makeJob = () => Norm.normalizeJob({
  jobId: 'job-1', employerId: 'emp-1', title: 'L1 Support Analyst',
  requirements: [
    { text: 'ServiceNow', level: 80, necessity: 'required', evidenceKinds: ['certification'] },
    { competencyId: 'workplace.communication', level: 0.6, necessity: 'preferred' },
    { text: 'Underwater basket weaving', level: 50 },
    { text: 'SAP', necessity: 'required', evidenceKinds: ['simulation'] },
    { text: 'denials', level: 50, necessity: 'required' }
  ]
}).job;

const makeCand = () => Cand.createCandidateMatchInput({
  candidateId: 'cand-1',
  readiness: { competencies: { 'it.servicenow.fundamentals': 70, 'workplace.communication': 0.6, 'enterprise.sap.fundamentals': 60 } },
  evidence: [
    { evidenceId: 'ev-2', kind: 'assessment', competencyRef: 'workplace.communication' },
    { evidenceId: 'ev-1', kind: 'certification', competencyRef: 'it.servicenow.fundamentals', verified: true, source: 'registry' }
  ]
});

describe('Phase 8B — Job <-> Candidate match', function () {
  it('loads as a pure module and imports neither 7C nor the Registry', function () {
    const src = fs.readFileSync(file, 'utf8');
    assert(!/require\(['"](fs|http|https|child_process|net)['"]\)|\bfetch\(|localStorage|Date\.now|new Date\(|Math\.random/.test(src));
    assert(!/professional-readiness-projection|registry/i.test(src.replace(/\/\*[\s\S]*?\*\//, '')));
    assert.deepStrictEqual(Object.keys(Match).sort(), ['MATCHER_VERSION', 'matchCandidateToJob']);
  });

  it('does not mutate inputs', function () {
    const job = deepFreeze(makeJob()); const cand = deepFreeze(makeCand());
    const before = JSON.stringify([job, cand]);
    Match.matchCandidateToJob(job, cand);
    assert.strictEqual(JSON.stringify([job, cand]), before);
  });

  it('assigns met / present / gap / no-candidate-data / unmapped per requirement', function () {
    const r = Match.matchCandidateToJob(makeJob(), makeCand());
    assert.deepStrictEqual(r.requirements.map(x => x.status), ['gap', 'met', 'unmapped', 'present', 'no-candidate-data']);
  });

  it('computes gaps with rounding and never treats missing data as zero', function () {
    const r = Match.matchCandidateToJob(makeJob(), makeCand());
    assert.strictEqual(r.requirements[0].gap, 0.1);
    assert.strictEqual(r.requirements[1].gap, 0);
    assert.strictEqual(r.requirements[4].gap, null);
    assert.strictEqual(r.requirements[4].candidateScore, null);
    assert.strictEqual(r.requirements[2].gap, null);
  });

  it('excludes unmapped requirements from coverage and reports summary honestly', function () {
    const s = Match.matchCandidateToJob(makeJob(), makeCand()).summary;
    assert.strictEqual(s.total, 5);
    assert.strictEqual(s.mapped, 4);
    assert.strictEqual(s.coverage, 0.5);
    assert.strictEqual(s.requiredMapped, 3);
    assert.strictEqual(s.requiredCoverage, 0.3333);
    assert.deepStrictEqual(s.requiredGaps, ['job-1:req:1', 'job-1:req:5']);
    assert.strictEqual(s.unspecifiedNecessity, 1);
    assert.deepStrictEqual(s.byStatus, { met: 1, present: 1, gap: 1, 'no-candidate-data': 1, unmapped: 1 });
  });

  it('links supporting evidence and reports evidence-kind match without inventing verification', function () {
    const r = Match.matchCandidateToJob(makeJob(), makeCand());
    assert.deepStrictEqual(r.requirements[0].supportingEvidence, [{ evidenceId: 'ev-1', kind: 'certification', verified: true }]);
    assert.strictEqual(r.requirements[0].evidenceKindMatch, true);
    assert.strictEqual(r.requirements[1].supportingEvidence[0].verified, null);
    assert.strictEqual(r.requirements[1].evidenceKindMatch, null);
    assert.strictEqual(r.requirements[3].evidenceKindMatch, false);
  });

  it('is deterministic and returns deeply frozen output', function () {
    const a = Match.matchCandidateToJob(makeJob(), makeCand());
    const b = Match.matchCandidateToJob(makeJob(), makeCand());
    assert.deepStrictEqual(a, b);
    assert(Object.isFrozen(a) && Object.isFrozen(a.requirements) && Object.isFrozen(a.summary) && Object.isFrozen(a.audit));
  });

  it('returns a deterministic empty result for a job with no requirements', function () {
    const job = Norm.normalizeJob({ jobId: 'j', employerId: 'e', title: 'T' }).job;
    const r = Match.matchCandidateToJob(job, makeCand());
    assert.deepStrictEqual(r.requirements, []);
    assert.strictEqual(r.summary.coverage, null);
    assert.strictEqual(r.summary.requiredCoverage, null);
    assert.deepStrictEqual(r.summary.requiredGaps, []);
  });

  it('produces no ranking, overall score, or automated decision', function () {
    const r = Match.matchCandidateToJob(makeJob(), makeCand());
    const banned = ['rank', 'ranking', 'overallScore', 'totalScore', 'recommendation', 'decision', 'verdict', 'pass', 'fail'];
    allKeys(r).forEach(k => assert(!banned.includes(k), 'banned key: ' + k));
    assert.deepStrictEqual(r.review, { humanReviewRequired: true, automatedDecision: false });
  });

  it('writes an audit record with versions, ids, basis and a stable input fingerprint', function () {
    const r = Match.matchCandidateToJob(makeJob(), makeCand());
    assert.strictEqual(r.audit.matcherVersion, Match.MATCHER_VERSION);
    assert.strictEqual(r.audit.jobId, 'job-1');
    assert.strictEqual(r.audit.candidateId, 'cand-1');
    assert.strictEqual(r.audit.taxonomyVersion, '1.0.0');
    assert.strictEqual(r.audit.requirementCount, 5);
    assert.strictEqual(r.audit.candidateBasis.evidenceCount, 2);
    assert(/^[0-9a-f]{8}$/.test(r.audit.inputFingerprint));
    assert.strictEqual(r.audit.inputFingerprint, Match.matchCandidateToJob(makeJob(), makeCand()).audit.inputFingerprint);
    const changed = Cand.createCandidateMatchInput({ candidateId: 'cand-1', readiness: { competencies: { 'it.servicenow.fundamentals': 90 } } });
    assert.notStrictEqual(Match.matchCandidateToJob(makeJob(), changed).audit.inputFingerprint, r.audit.inputFingerprint);
  });

  it('fingerprint ignores object key order', function () {
    const job = makeJob();
    const a = Match.matchCandidateToJob(job, { candidateId: 'c', competencies: { b: 0.5, a: 0.6 }, evidence: [] });
    const b = Match.matchCandidateToJob(job, { candidateId: 'c', competencies: { a: 0.6, b: 0.5 }, evidence: [] });
    assert.strictEqual(a.audit.inputFingerprint, b.audit.inputFingerprint);
  });

  it('validates inputs and rejects protected attributes', function () {
    assert.throws(() => Match.matchCandidateToJob(null, makeCand()), /jobId/);
    assert.throws(() => Match.matchCandidateToJob(makeJob(), {}), /candidateId/);
    assert.throws(() => Match.matchCandidateToJob(makeJob(), Object.assign({}, makeCand(), { gender: 'x' })), /protected attribute/);
  });

  it('does not fall back to dimension scores when competency data is absent', function () {
    const cand = Cand.createCandidateMatchInput({ candidateId: 'c', readiness: { dimensions: { technical: 95 } } });
    const r = Match.matchCandidateToJob(makeJob(), cand);
    assert(r.requirements.filter(x => x.status !== 'unmapped').every(x => x.status === 'no-candidate-data'));
  });
});
