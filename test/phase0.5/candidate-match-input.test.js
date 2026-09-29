'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../html/js/career/tsm-candidate-match-input.js');
const M = require(file);

function deepFreeze(o) {
  Object.keys(o).forEach(k => { if (o[k] && typeof o[k] === 'object') deepFreeze(o[k]); });
  return Object.freeze(o);
}
const raw = () => ({
  candidateId: 'cand-1', roleId: 'l1-analyst',
  readiness: {
    dimensions: [{ dimensionId: 'technical', score: 80 }, { id: 'workplace', value: 0.6 }],
    competencies: { 'it.servicenow.fundamentals': 70, 'workplace.communication': { score: 0.5 } }
  },
  evidence: [
    { evidenceId: 'ev-1', kind: 'certification', competencyRef: 'it.servicenow.fundamentals', verified: true, source: 'registry' },
    { evidenceId: 'ev-2', kind: 'assessment' }
  ]
});

describe('Phase 8B-0 — Candidate match input contract', function () {
  it('loads as a pure module', function () {
    const src = fs.readFileSync(file, 'utf8');
    assert(!/require\(['"](fs|http|https|child_process|net)['"]\)|\bfetch\(|localStorage|Date\.now|new Date\(|Math\.random/.test(src));
    assert(!/professional-readiness-projection|registry/i.test(src.replace(/\/\*[\s\S]*?\*\//, '')), 'must not import 7C or Registry');
    assert.strictEqual(typeof M.createCandidateMatchInput, 'function');
  });

  it('does not mutate input', function () {
    const input = deepFreeze(raw());
    const before = JSON.stringify(input);
    M.createCandidateMatchInput(input);
    assert.strictEqual(JSON.stringify(input), before);
  });

  it('normalizes dimensions and competencies to canonical 0-1', function () {
    const c = M.createCandidateMatchInput(raw());
    assert.deepStrictEqual(c.dimensions, { technical: 0.8, workplace: 0.6 });
    assert.deepStrictEqual(c.competencies, { 'it.servicenow.fundamentals': 0.7, 'workplace.communication': 0.5 });
  });

  it('accepts 0-1 and 0-100 identically', function () {
    assert.strictEqual(M.normScore(0.8), M.normScore(80));
    assert.strictEqual(M.normScore(-1), null);
    assert.strictEqual(M.normScore(101), null);
  });

  it('preserves provenance without inventing verification', function () {
    const c = M.createCandidateMatchInput(raw());
    assert.strictEqual(c.evidence[0].verified, true);
    assert.strictEqual(c.evidence[1].verified, null);
    assert.strictEqual(c.evidence[1].source, null);
    assert.strictEqual(c.evidence[1].competencyRef, null);
  });

  it('rejects protected-class and identity fields anywhere', function () {
    assert.throws(() => M.createCandidateMatchInput(Object.assign(raw(), { gender: 'x' })), /protected attribute/);
    assert.throws(() => M.createCandidateMatchInput(Object.assign(raw(), { email: 'a@b.c' })), /identity field/);
    const e = raw(); e.evidence[0].fullName = 'x';
    assert.throws(() => M.createCandidateMatchInput(e), /identity field/);
  });

  it('requires an opaque candidateId', function () {
    assert.throws(() => M.createCandidateMatchInput({}), /candidateId/);
    assert.throws(() => M.createCandidateMatchInput({ candidateId: '  ' }), /candidateId/);
  });

  it('returns a deterministic empty profile for no readiness/evidence', function () {
    const a = M.createCandidateMatchInput({ candidateId: 'c' });
    assert.deepStrictEqual(a, M.createCandidateMatchInput({ candidateId: 'c' }));
    assert.deepStrictEqual(a.basis, { evidenceCount: 0, dimensionCount: 0, competencyCount: 0, hasReadiness: false });
    assert.deepStrictEqual(a.dimensions, {});
  });

  it('keeps basis tied to actual data and drops invalid entries', function () {
    const c = M.createCandidateMatchInput({
      candidateId: 'c', readiness: { dimensions: [{ dimensionId: 'technical', score: 'abc' }, { dimensionId: 'workplace', score: 40 }] },
      evidence: [{ kind: 'no-id' }, { evidenceId: 'ok' }]
    });
    assert.deepStrictEqual(c.dimensions, { workplace: 0.4 });
    assert.strictEqual(c.basis.evidenceCount, 1);
    assert.strictEqual(c.basis.dimensionCount, 1);
  });

  it('is deterministic regardless of input key order and returns frozen output', function () {
    const a = M.createCandidateMatchInput({ candidateId: 'c', readiness: { dimensions: { b: 50, a: 60 } } });
    const b = M.createCandidateMatchInput({ candidateId: 'c', readiness: { dimensions: { a: 60, b: 50 } } });
    assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
    assert(Object.isFrozen(a) && Object.isFrozen(a.dimensions) && Object.isFrozen(a.evidence));
  });
});
