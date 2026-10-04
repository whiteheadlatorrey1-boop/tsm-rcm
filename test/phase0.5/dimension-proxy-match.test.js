'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const base = path.join(__dirname, '../../html/js/career');
const file = path.join(base, 'tsm-dimension-proxy-match.js');
const Proxy8 = require(file);
const Match = require(path.join(base, 'tsm-job-candidate-match.js'));
const Norm = require(path.join(base, 'tsm-job-requirement-normalizer.js'));
const Cand = require(path.join(base, 'tsm-candidate-match-input.js'));
const Adapter = require(path.join(base, 'tsm-candidate-readiness-adapter.js'));

function project(ev) {
  const ctx = { console, globalThis: {} };
  vm.runInNewContext(fs.readFileSync(path.join(base, 'tsm-professional-readiness-projection.js'), 'utf8'), ctx);
  return JSON.parse(JSON.stringify(ctx.globalThis.TSMProfessionalReadinessProjection.project(ev)));
}
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
  jobId: 'j1', employerId: 'e1', title: 'Analyst',
  requirements: [
    { text: 'ServiceNow', level: 80, necessity: 'required' },
    { text: 'denials', level: 95, necessity: 'required' },
    { text: 'communication', level: 60 },
    { text: 'Nonsense skill', level: 50 }
  ]
}).job;
const cand = dims => Cand.createCandidateMatchInput({ candidateId: 'c1', readiness: { dimensions: dims } });
const run = (c, opts) => Proxy8.applyDimensionProxy(Match.matchCandidateToJob(job(), c), c, opts);

describe('Phase 8B-2 — Dimension proxy (opt-in stopgap)', function () {
  it('is pure and imports no 7C, 8B or Registry module', function () {
    const src = fs.readFileSync(file, 'utf8');
    assert(!/require\(/.test(src));
    assert(!/Date\.now|new Date\(|Math\.random|fetch\(|localStorage/.test(src));
  });

  it('does not mutate inputs', function () {
    const c = cand({ technicalCompetency: 91 });
    const m = deepFreeze(Match.matchCandidateToJob(job(), c));
    const before = JSON.stringify([m, c]);
    Proxy8.applyDimensionProxy(m, deepFreeze(c));
    assert.strictEqual(JSON.stringify([m, c]), before);
  });

  it('upgrades only requirements with a mapped, scored dimension', function () {
    const r = run(cand({ technicalCompetency: 91, domainCompetency: 91 }));
    assert.deepStrictEqual(r.requirements.map(x => x.status), ['dimension-proxy', 'dimension-proxy', 'no-candidate-data', 'unmapped']);
    assert.strictEqual(r.requirements[0].proxyDimension, 'technicalCompetency');
    assert.strictEqual(r.requirements[0].gap, 0);
    assert.strictEqual(r.requirements[1].gap, 0.04);
    assert.strictEqual(r.proxySummary.applied, 2);
    assert.strictEqual(r.proxySummary.remainingNoData, 1);
  });

  it('never falls back when the mapped dimension has no score', function () {
    const r = run(cand({ domainCompetency: 91 }));
    assert.strictEqual(r.requirements[0].status, 'no-candidate-data');
    assert.strictEqual(r.requirements[0].candidateScore, null);
  });

  it('never touches met, gap or unmapped requirements', function () {
    const c = Cand.createCandidateMatchInput({ candidateId: 'c1', readiness: {
      competencies: { 'it.servicenow.fundamentals': 70 }, dimensions: { technicalCompetency: 99, domainCompetency: 99 } } });
    const base = Match.matchCandidateToJob(job(), c);
    const r = Proxy8.applyDimensionProxy(base, c);
    assert.strictEqual(r.requirements[0].status, 'gap');
    assert.strictEqual(r.requirements[0].candidateScore, 0.7);
    assert.strictEqual(r.requirements[3].status, 'unmapped');
  });

  it('leaves the original summary and coverage exactly as 8B computed them', function () {
    const c = cand({ technicalCompetency: 91, domainCompetency: 91 });
    const base = Match.matchCandidateToJob(job(), c);
    const r = Proxy8.applyDimensionProxy(base, c);
    assert.deepStrictEqual(r.summary, base.summary);
    assert.strictEqual(r.summary.coverage, 0);
  });

  it('is labeled internal-only and keeps human review, with no ranking or decision keys', function () {
    const r = run(cand({ technicalCompetency: 91 }));
    assert.strictEqual(r.employerFacing, false);
    assert.strictEqual(r.requirements[0].proxyBasis, 'dimension-level score; not competency evidence');
    assert.deepStrictEqual(r.review, { humanReviewRequired: true, automatedDecision: false });
    const banned = ['rank', 'ranking', 'overallScore', 'totalScore', 'recommendation', 'decision', 'verdict', 'pass', 'fail'];
    allKeys(r).forEach(k => assert(!banned.includes(k), 'banned key: ' + k));
  });

  it('is deterministic and deeply frozen', function () {
    const a = run(cand({ technicalCompetency: 91 }));
    const b = run(cand({ technicalCompetency: 91 }));
    assert.deepStrictEqual(a, b);
    assert(Object.isFrozen(a) && Object.isFrozen(a.requirements) && Object.isFrozen(a.requirements[0]) && Object.isFrozen(a.proxySummary) && Object.isFrozen(a.audit));
  });

  it('records proxy versions and preserves the original input fingerprint in the audit', function () {
    const c = cand({ technicalCompetency: 91 });
    const base = Match.matchCandidateToJob(job(), c);
    const r = Proxy8.applyDimensionProxy(base, c);
    assert.strictEqual(r.audit.inputFingerprint, base.audit.inputFingerprint);
    assert.strictEqual(r.audit.proxyVersion, Proxy8.PROXY_VERSION);
    assert.strictEqual(r.audit.proxyMapVersion, Proxy8.MAP_VERSION);
    assert.strictEqual(r.audit.proxyApplied, 1);
  });

  it('supports a custom map with its own version', function () {
    const r = run(cand({ communication: 0.9 }), { map: { 'it.servicenow.fundamentals': 'communication' }, mapVersion: 'x1' });
    assert.strictEqual(r.requirements[0].status, 'dimension-proxy');
    assert.strictEqual(r.proxySummary.mapVersion, 'x1');
    assert.strictEqual(r.requirements[1].status, 'no-candidate-data');
  });

  it('validates inputs', function () {
    const c = cand({ technicalCompetency: 91 });
    const m = Match.matchCandidateToJob(job(), c);
    assert.throws(() => Proxy8.applyDimensionProxy(null, c), /match result/);
    assert.throws(() => Proxy8.applyDimensionProxy(m, {}), /candidate required/);
    assert.throws(() => Proxy8.applyDimensionProxy(m, Cand.createCandidateMatchInput({ candidateId: 'other' })), /does not match/);
  });

  it('end to end: real 7C output -> 8B-1 -> 8B -> proxy', function () {
    const p = project([{ category: 'rcm', kind: 'career_training_attempt', score: 91, dimensions: ['technicalCompetency'], verified: true }]);
    const c = Adapter.toMatchInput({ candidateId: 'c1' }, p);
    const r = Proxy8.applyDimensionProxy(Match.matchCandidateToJob(job(), c), c);
    assert.strictEqual(r.requirements[0].status, 'dimension-proxy');
    assert.strictEqual(r.requirements[0].candidateScore, 0.91);
    assert.strictEqual(r.requirements[1].status, 'no-candidate-data');
    assert.strictEqual(r.employerFacing, false);
  });
});
