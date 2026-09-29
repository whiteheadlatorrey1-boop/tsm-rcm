'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, '../../html/js/career');
const file = path.join(base, 'tsm-match-explainer.js');
const Ex = require(file);
const Match = require(path.join(base, 'tsm-job-candidate-match.js'));
const Norm = require(path.join(base, 'tsm-job-requirement-normalizer.js'));
const Cand = require(path.join(base, 'tsm-candidate-match-input.js'));
const Proxy8 = require(path.join(base, 'tsm-dimension-proxy-match.js'));

function deepFreeze(o) {
  Object.keys(o).forEach(k => { if (o[k] && typeof o[k] === 'object') deepFreeze(o[k]); });
  return Object.freeze(o);
}
function allKeys(o, acc) {
  acc = acc || [];
  if (o && typeof o === 'object') Object.keys(o).forEach(k => { acc.push(k); allKeys(o[k], acc); });
  return acc;
}
const job = () => Norm.normalizeJob({
  jobId: 'job-1', employerId: 'emp-1', title: 'L1 Support Analyst',
  requirements: [
    { text: 'ServiceNow', level: 80, necessity: 'required' },
    { competencyId: 'workplace.communication', level: 0.6, necessity: 'preferred' },
    { text: 'Underwater basket weaving', level: 50 },
    { text: 'SAP', necessity: 'required' },
    { text: 'denials', level: 50, necessity: 'required' }
  ]
}).job;
const cand = () => Cand.createCandidateMatchInput({
  candidateId: 'cand-1',
  readiness: { competencies: { 'it.servicenow.fundamentals': 70, 'workplace.communication': 0.6, 'enterprise.sap.fundamentals': 60 } },
  evidence: [{ evidenceId: 'ev-1', kind: 'certification', competencyRef: 'it.servicenow.fundamentals', verified: true }]
});
const result = () => Match.matchCandidateToJob(job(), cand());

describe('Phase 8C — Match explainer', function () {
  it('is pure and requires no other module', function () {
    const src = fs.readFileSync(file, 'utf8');
    assert(!/require\(/.test(src));
    assert(!/Date\.now|new Date\(|Math\.random|fetch\(|localStorage/.test(src));
  });

  it('does not mutate its input', function () {
    const r = deepFreeze(result());
    const before = JSON.stringify(r);
    Ex.explainMatch(r);
    assert.strictEqual(JSON.stringify(r), before);
  });

  it('explains every status in plain language', function () {
    const e = Ex.explainMatch(result());
    assert.deepStrictEqual(e.requirements.map(x => x.status), ['gap', 'met', 'unmapped', 'present', 'no-candidate-data']);
    assert(e.requirements[0].detail.includes('10 points'));
    assert(e.requirements[0].detail.includes('candidate 70%, required 80%'));
    assert(e.requirements[1].detail.includes('Meets the required level'));
    assert(e.requirements[2].detail.includes('not scored'));
    assert.strictEqual(e.requirements[2].label, 'Underwater basket weaving');
    assert(e.requirements[3].detail.includes('no required level'));
    assert(e.requirements[4].detail.includes('not a zero score'));
  });

  it('reports supporting evidence counts without inventing verification', function () {
    const e = Ex.explainMatch(result());
    assert(e.requirements[0].evidenceNote.includes('1 supporting evidence record'));
    assert(e.requirements[0].evidenceNote.includes('1 marked verified'));
    assert.strictEqual(e.requirements[4].evidenceNote, null);
  });

  it('builds an overview that matches the requirement statuses', function () {
    const o = Ex.explainMatch(result()).overview;
    assert.deepStrictEqual(
      { n: o.evaluated, m: o.met, p: o.present, g: o.gap, d: o.noCandidateData, x: o.dimensionProxy, u: o.unmapped, s: o.unspecifiedNecessity },
      { n: 5, m: 1, p: 1, g: 1, d: 1, x: 0, u: 1, s: 1 });
    assert.deepStrictEqual(o.requiredAttention, ['job-1:req:1', 'job-1:req:5']);
    assert(o.lines[o.lines.length - 1].includes('not a hiring decision'));
  });

  it('labels dimension-proxy results as indicators, internal only', function () {
    const c = Cand.createCandidateMatchInput({ candidateId: 'c1', readiness: { dimensions: { technicalCompetency: 91 } } });
    const p = Proxy8.applyDimensionProxy(Match.matchCandidateToJob(job(), c), c);
    const e = Ex.explainMatch(p);
    assert.strictEqual(e.employerFacing, false);
    assert.strictEqual(e.requirements[0].status, 'dimension-proxy');
    assert(e.requirements[0].detail.includes('Not competency evidence'));
    assert(e.requirements[0].detail.includes('Internal use only'));
    assert(e.requirements[0].detail.includes('technicalCompetency'));
    assert.strictEqual(e.overview.dimensionProxy, 1);
    assert(e.overview.lines.some(l => l.includes('not competency evidence')));
  });

  it('is deterministic and deeply frozen', function () {
    const a = Ex.explainMatch(result());
    assert.deepStrictEqual(a, Ex.explainMatch(result()));
    assert(Object.isFrozen(a) && Object.isFrozen(a.requirements) && Object.isFrozen(a.requirements[0]) && Object.isFrozen(a.overview) && Object.isFrozen(a.overview.lines));
  });

  it('handles a job with no requirements', function () {
    const j = Norm.normalizeJob({ jobId: 'j', employerId: 'e', title: 'T' }).job;
    const e = Ex.explainMatch(Match.matchCandidateToJob(j, cand()));
    assert.deepStrictEqual(e.requirements, []);
    assert.strictEqual(e.overview.evaluated, 0);
  });

  it('has no ranking, overall score, or decision keys and keeps human review', function () {
    const e = Ex.explainMatch(result());
    const banned = ['rank', 'ranking', 'overallScore', 'totalScore', 'recommendation', 'decision', 'verdict', 'pass', 'fail'];
    allKeys(e).forEach(k => assert(!banned.includes(k), 'banned key: ' + k));
    assert.deepStrictEqual(e.review, { humanReviewRequired: true, automatedDecision: false });
  });

  it('validates input', function () {
    assert.throws(() => Ex.explainMatch(null), /match result/);
    assert.throws(() => Ex.explainMatch({ jobId: 'j' }), /match result/);
  });
});
