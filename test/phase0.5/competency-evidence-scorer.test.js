'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, '../../html/js/career');
const file = path.join(base, 'tsm-competency-evidence-scorer.js');
const Scorer = require(file);
const Taxonomy = require(path.join(base, 'tsm-competency-taxonomy.js'));
const Norm = require(path.join(base, 'tsm-job-requirement-normalizer.js'));
const Cand = require(path.join(base, 'tsm-candidate-match-input.js'));
const Match = require(path.join(base, 'tsm-job-candidate-match.js'));
const Explain = require(path.join(base, 'tsm-match-explainer.js'));
const Layer7B = require(path.join(__dirname, '../../server/readiness/evidence-layer.js'));

function deepFreeze(o) {
  Object.keys(o).forEach(k => { if (o[k] && typeof o[k] === 'object') deepFreeze(o[k]); });
  return Object.freeze(o);
}
const rec = (id, type, score, extra) => Object.assign(
  { evidenceId: id, type, kind: 'knowledge', category: 'it_l1', score, scored: score !== null, weight: 1, verification: 'system_recorded' },
  extra || {});

describe('Phase 8D — Competency scoring from evidence', function () {
  it('is pure and requires no other module', function () {
    const src = fs.readFileSync(file, 'utf8');
    assert(!/require\(/.test(src));
    assert(!/Date\.now|new Date\(|Math\.random|fetch\(|localStorage/.test(src));
  });

  it('does not mutate its input', function () {
    const input = deepFreeze([rec('a', 'servicenow_itil_exam', 80)]);
    const before = JSON.stringify(input);
    Scorer.scoreCompetencies(input);
    assert.strictEqual(JSON.stringify(input), before);
  });

  it('computes a weighted mean per competency on a 0-1 scale', function () {
    const r = Scorer.scoreCompetencies([
      rec('a', 'servicenow_itil_exam', 80, { weight: 3 }),
      rec('b', 'servicenow_itil_exam', 40, { weight: 1 }),
      rec('c', 'l1_resolution', 90),
      rec('d', 'l1_escalation', 70)
    ]);
    assert.deepStrictEqual(r.competencies, { 'it.l1.ticket-triage': 0.8, 'it.servicenow.fundamentals': 0.7 });
    assert.strictEqual(r.basis.scoredCount, 4);
    assert.strictEqual(r.basis.competencyCount, 2);
  });

  it('keeps unscored tagged evidence as evidence but never as a zero score', function () {
    const r = Scorer.scoreCompetencies([rec('a', 'servicenow_itil_exam', null)]);
    assert.strictEqual(r.evidence.length, 1);
    assert.strictEqual(r.evidence[0].competencyRef, 'it.servicenow.fundamentals');
    assert.deepStrictEqual(r.competencies, {});
  });

  it('leaves unmapped event types untagged with a reason, and never guesses', function () {
    const r = Scorer.scoreCompetencies([
      rec('a', 'quiz', 90), rec('b', 'mlo_safe_quiz', 90), rec('c', 'career_training_attempt', 90), rec('d', 'readiness_assessment', 90)
    ]);
    assert.deepStrictEqual(r.competencies, {});
    assert.deepStrictEqual(r.untagged.map(u => u.reason), ['no_competency_mapping', 'no_competency_mapping', 'no_competency_mapping', 'no_competency_mapping']);
    assert.strictEqual(r.basis.taggedCount, 0);
  });

  it('does not read competency tags from client-supplied meta', function () {
    const r = Scorer.scoreCompetencies([rec('a', 'quiz', 95, { meta: { competencyId: 'it.servicenow.fundamentals' }, competencyRef: 'it.servicenow.fundamentals' })]);
    assert.deepStrictEqual(r.competencies, {});
    assert.strictEqual(r.untagged.length, 1);
  });

  it('never upgrades verification', function () {
    const r = Scorer.scoreCompetencies([rec('a', 'servicenow_itil_exam', 80), rec('b', 'servicenow_itil_exam', 80, { verification: 'verified' })]);
    assert.deepStrictEqual(r.evidence.map(e => e.verified), [null, true]);
  });

  it('rejects out-of-range scores and malformed records without throwing', function () {
    const r = Scorer.scoreCompetencies([rec('a', 'servicenow_itil_exam', 150), null, { type: 'servicenow_itil_exam' }, rec('b', 'servicenow_itil_exam', 60)]);
    assert.deepStrictEqual(r.competencies, { 'it.servicenow.fundamentals': 0.6 });
    assert.strictEqual(r.untagged.filter(u => u.reason === 'malformed_record').length, 2);
    assert.deepStrictEqual(Scorer.scoreCompetencies(undefined).basis, { recordCount: 0, taggedCount: 0, untaggedCount: 0, scoredCount: 0, competencyCount: 0 });
  });

  it('supports a custom map and validates competency ids against a taxonomy', function () {
    const r = Scorer.scoreCompetencies([rec('a', 'quiz', 80), rec('b', 'module_complete', 80)],
      { map: { quiz: 'enterprise.sap.fundamentals', module_complete: 'not.a.real.id' }, mapVersion: 'x1',
        validCompetencyIds: Taxonomy.defaultTaxonomy.entries.map(e => e.competencyId) });
    assert.deepStrictEqual(r.competencies, { 'enterprise.sap.fundamentals': 0.8 });
    assert.strictEqual(r.untagged[0].reason, 'unknown_competency');
    assert.strictEqual(r.tagMapVersion, 'x1');
  });

  it('default tag map only points at real taxonomy competencies', function () {
    Object.keys(Scorer.DEFAULT_TAG_MAP).forEach(t => assert(Taxonomy.defaultTaxonomy.get(Scorer.DEFAULT_TAG_MAP[t]), t));
  });

  it('exposes the 7A -> 7C dimension name map, with professional unmapped', function () {
    const m = Scorer.DIMENSION_NAME_MAP_7A_TO_7C;
    assert.strictEqual(m.technical, 'technicalCompetency');
    assert.strictEqual(m.reliability, 'professionalReliability');
    assert.strictEqual(m.professional, null);
  });

  it('is deterministic and deeply frozen', function () {
    const mk = () => Scorer.scoreCompetencies([rec('a', 'servicenow_itil_exam', 80), rec('b', 'quiz', 50)]);
    assert.deepStrictEqual(mk(), mk());
    const r = mk();
    assert(Object.isFrozen(r) && Object.isFrozen(r.competencies) && Object.isFrozen(r.evidence) && Object.isFrozen(r.evidence[0]) && Object.isFrozen(r.untagged) && Object.isFrozen(r.basis));
  });

  it('end to end: real 7B records -> scorer -> 8B-0 -> 8B -> 8C give real met/gap results', function () {
    const events = [
      { type: 'servicenow_itil_exam', score: 85 },
      { type: 'servicenow_itil_exam', score: 65 },
      { type: 'l1_resolution', score: 90 },
      { type: 'l1_escalation', score: 70 }
    ];
    const out = Layer7B.normalizeEvidence(events, { candidateId: 'cand-1' });
    assert.strictEqual(out.records.length, events.length, 'rejected by 7B: ' + JSON.stringify(out.rejected));

    const scored = Scorer.scoreCompetencies(out.records);
    const cand = Cand.createCandidateMatchInput({
      candidateId: 'cand-1',
      readiness: { competencies: scored.competencies },
      evidence: scored.evidence
    });
    const job = Norm.normalizeJob({
      jobId: 'job-1', employerId: 'emp-1', title: 'L1 Analyst',
      requirements: [
        { text: 'ServiceNow', level: 80, necessity: 'required' },
        { text: 'ticket triage', level: 70, necessity: 'required' },
        { text: 'communication', level: 60 },
        { text: 'Nonsense skill', level: 50 }
      ]
    }).job;

    const m = Match.matchCandidateToJob(job, cand);
    assert.deepStrictEqual(m.requirements.map(x => x.status), ['gap', 'met', 'no-candidate-data', 'unmapped']);
    assert.strictEqual(m.requirements[0].candidateScore, 0.75);
    assert.strictEqual(m.requirements[0].gap, 0.05);
    assert.strictEqual(m.requirements[0].supportingEvidence.length, 2);
    assert.strictEqual(m.requirements[0].supportingEvidence[0].verified, null);
    assert.strictEqual(m.summary.coverage, 0.3333);

    const e = Explain.explainMatch(m);
    assert(e.requirements[0].detail.includes('5 points'));
    assert.deepStrictEqual(e.review, { humanReviewRequired: true, automatedDecision: false });
  });
});
