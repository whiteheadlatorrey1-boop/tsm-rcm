'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const base = path.join(__dirname, '../../html/js/career');
const adapterFile = path.join(base, 'tsm-candidate-readiness-adapter.js');
const Adapter = require(adapterFile);
const Match = require(path.join(base, 'tsm-job-candidate-match.js'));
const Norm = require(path.join(base, 'tsm-job-requirement-normalizer.js'));

function loadProjection() {
  const ctx = { console, globalThis: {} };
  vm.runInNewContext(fs.readFileSync(path.join(base, 'tsm-professional-readiness-projection.js'), 'utf8'), ctx);
  return ctx.globalThis.TSMProfessionalReadinessProjection;
}
const project = ev => JSON.parse(JSON.stringify(loadProjection().project(ev)));
function deepFreeze(o) {
  Object.keys(o).forEach(k => { if (o[k] && typeof o[k] === 'object') deepFreeze(o[k]); });
  return Object.freeze(o);
}
const fixture = () => [{ category: 'rcm', kind: 'career_training_attempt', score: 91, dimensions: ['domainCompetency'], verified: true }];
const job = () => Norm.normalizeJob({
  jobId: 'j1', employerId: 'e1', title: 'L1 Analyst',
  requirements: [{ text: 'ServiceNow', level: 80, necessity: 'required' }, { text: 'Nonsense skill', level: 50 }]
}).job;

describe('Phase 8B-1 — 7C readiness -> match input adapter', function () {
  it('is pure and imports neither 7C nor the Registry', function () {
    const src = fs.readFileSync(adapterFile, 'utf8');
    assert(!/require\(['"](fs|http|https|child_process|net)['"]\)|\bfetch\(|localStorage|Date\.now|new Date\(|Math\.random/.test(src));
    assert(!/professional-readiness-projection|registry/i.test(src.replace(/\/\*[\s\S]*?\*\//, '')));
  });

  it('does not mutate the profile', function () {
    const p = deepFreeze(project(fixture()));
    const before = JSON.stringify(p);
    Adapter.toMatchInput({ candidateId: 'c1' }, p);
    assert.strictEqual(JSON.stringify(p), before);
  });

  it('emits only evidence-informed dimensions, scaled 0-100 -> 0-1', function () {
    const c = Adapter.toMatchInput({ candidateId: 'c1' }, project(fixture()));
    assert.deepStrictEqual(c.dimensions, { domainCompetency: 0.91 });
    assert.strictEqual(c.basis.competencyCount, 0);
  });

  it('does not read uninformed zeros as scores, but keeps a real zero', function () {
    const none = Adapter.toMatchInput({ candidateId: 'c1' }, project([]));
    assert.deepStrictEqual(none.dimensions, {});
    assert.strictEqual(none.basis.hasReadiness, false);
    const real = Adapter.toMatchInput({ candidateId: 'c1' }, project([{ category: 'rcm', kind: 'career_training_attempt', score: 0, dimensions: ['domainCompetency'] }]));
    assert.strictEqual(real.dimensions.domainCompetency, 0);
  });

  it('preserves provenance without inventing verification or competency tags', function () {
    const c = Adapter.toMatchInput({ candidateId: 'c1' }, project(fixture()));
    assert.deepStrictEqual(c.evidence[0], { evidenceId: 'c1:basis:1', kind: 'career_training_attempt', competencyRef: null, verified: true, source: 'rcm' });
    const u = Adapter.toMatchInput({ candidateId: 'c1' }, project([{ category: 'rcm', kind: 'career_training_attempt', score: 50, dimensions: ['domainCompetency'] }]));
    assert.notStrictEqual(u.evidence[0].verified, true);
  });

  it('is deterministic', function () {
    assert.deepStrictEqual(Adapter.toMatchInput({ candidateId: 'c1' }, project(fixture())), Adapter.toMatchInput({ candidateId: 'c1' }, project(fixture())));
  });

  it('validates inputs', function () {
    assert.throws(() => Adapter.toMatchInput({ candidateId: 'c1' }, null), /profile required/);
    assert.throws(() => Adapter.toMatchInput({}, project(fixture())), /candidateId/);
  });

  it('end to end: real 7C output through 8B-0 and 8B leaves competency requirements as no-candidate-data', function () {
    const c = Adapter.toMatchInput({ candidateId: 'c1' }, project(fixture()));
    const r = Match.matchCandidateToJob(job(), c);
    assert.deepStrictEqual(r.requirements.map(x => x.status), ['no-candidate-data', 'unmapped']);
    assert.strictEqual(r.audit.candidateBasis.evidenceCount, 1);
    assert.deepStrictEqual(r.review, { humanReviewRequired: true, automatedDecision: false });
  });
});
