'use strict';

const assert = require('assert');
const { describe, it } = require('node:test');
const m = require('../../server/readiness/professional-readiness-model.js');

const at = '2026-09-29T12:00:00.000Z';

describe('Phase 7A - Professional Readiness model', function () {
  it('exposes the five 7A dimensions', function () {
    assert.deepStrictEqual(m.DIMENSIONS,
      ['technical', 'professional', 'communication', 'documentation', 'reliability']);
  });

  it('no events: every dimension is not_assessed, overall score is null (never 0)', function () {
    const r = m.assessProfessionalReadiness([]);
    m.DIMENSIONS.forEach(function (d) {
      assert.strictEqual(r.dimensions[d].score, null);
      assert.strictEqual(r.dimensions[d].status, 'not_assessed');
    });
    assert.strictEqual(r.overall.score, null);
    assert.strictEqual(r.overall.confidence, 'none');
    assert.strictEqual(r.overall.coverage, 0);
  });

  it('non-array input is treated as no evidence', function () {
    assert.strictEqual(m.assessProfessionalReadiness(null).overall.score, null);
  });

  it('unscored events are ignored and counted, not treated as zero', function () {
    const r = m.assessProfessionalReadiness([{ type: 'quiz', score: null }, { type: 'quiz' }]);
    assert.strictEqual(r.dimensions.technical.status, 'not_assessed');
    assert.strictEqual(r.ignored.unscored, 2);
  });

  it('unmapped event types are reported, never guessed into a dimension', function () {
    const r = m.assessProfessionalReadiness([{ type: 'mystery_event', score: 99 }]);
    assert.deepStrictEqual(r.ignored.unmapped, ['mystery_event']);
    assert.strictEqual(r.overall.score, null);
  });

  it('knowledge events feed technical only, weighted by event weight', function () {
    const r = m.assessProfessionalReadiness([
      { type: 'quiz', score: 80, weight: 1 },
      { type: 'module_complete', score: 100, weight: 3 },
    ]);
    assert.strictEqual(r.dimensions.technical.score, 95);
    assert.strictEqual(r.dimensions.professional.status, 'not_assessed');
    assert.strictEqual(r.dimensions.technical.evidenceQuality, 'knowledge');
  });

  it('operational L1 evidence outranks knowledge in evidence quality', function () {
    const r = m.assessProfessionalReadiness([
      { type: 'quiz', score: 70 },
      { type: 'l1_resolution', score: 90, recordedAt: at, meta: { category: 'Software/Access' } },
    ]);
    assert.strictEqual(r.dimensions.technical.evidenceQuality, 'operational');
    assert.ok(r.dimensions.documentation.status === 'assessed');
    assert.ok(r.dimensions.reliability.status === 'assessed');
  });

  it('readiness_assessment fans meta sub-scores out to the right dimensions', function () {
    const r = m.assessProfessionalReadiness([{
      type: 'readiness_assessment', score: 70,
      meta: { workflow: 60, compliance: 80, comm: 90, adapt: 100, track: 'Medical Billing' },
    }]);
    assert.strictEqual(r.dimensions.reliability.score, 60);
    assert.strictEqual(r.dimensions.communication.score, 90);
    assert.strictEqual(r.dimensions.professional.score, 90); // mean of compliance 80 + adapt 100
    assert.strictEqual(r.dimensions.technical.status, 'not_assessed');
  });

  it('readiness_assessment with no numeric sub-scores contributes nothing', function () {
    const r = m.assessProfessionalReadiness([{ type: 'readiness_assessment', score: 70, meta: {} }]);
    assert.strictEqual(r.overall.score, null);
  });

  it('every contribution carries what/where/when/score/evidence/source provenance', function () {
    const r = m.assessProfessionalReadiness([
      { type: 'servicenow_itil_exam', score: 82, recordedAt: at, meta: { source: 'servicenow_itil_exam_sim' } },
    ]);
    const p = r.dimensions.technical.provenance[0];
    assert.strictEqual(p.what, 'servicenow_itil_exam');
    assert.strictEqual(p.where, 'servicenow_itil_exam_sim');
    assert.strictEqual(p.when, at);
    assert.strictEqual(p.score, 82);
    assert.strictEqual(p.source, 'candidate-registry:training-events');
    assert.strictEqual(p.evidence.source, 'servicenow_itil_exam_sim');
  });

  it('scores are clamped to 0-100', function () {
    const r = m.assessProfessionalReadiness([{ type: 'quiz', score: 250 }]);
    assert.strictEqual(r.dimensions.technical.score, 100);
  });

  it('overall confidence is capped by coverage (1 of 5 dimensions is never high)', function () {
    const events = [];
    for (let i = 0; i < 6; i++) {
      events.push({ type: 'quiz', score: 90, meta: { source: 's' + (i % 2) } });
    }
    const r = m.assessProfessionalReadiness(events);
    assert.strictEqual(r.dimensions.technical.confidence, 'high');
    assert.strictEqual(r.overall.coverage, 0.2);
    assert.strictEqual(r.overall.confidence, 'low');
    assert.deepStrictEqual(r.overall.assessedDimensions, ['technical']);
  });

  it('full-coverage, well-evidenced profile reaches high confidence', function () {
    const events = [];
    for (let i = 0; i < 6; i++) {
      const src = { source: 'src' + (i % 2) };
      events.push({ type: 'quiz', score: 80, meta: src });
      events.push({ type: 'l1_resolution', score: 85, meta: src });
      events.push({ type: 'l1_escalation', score: 75, meta: src });
      events.push({ type: 'mock_shift', score: 78, meta: src });
    }
    const r = m.assessProfessionalReadiness(events);
    assert.strictEqual(r.overall.coverage, 1);
    assert.strictEqual(r.overall.confidence, 'high');
    assert.deepStrictEqual(r.overall.missingDimensions, []);
  });

  it('does not mutate its input', function () {
    const events = [{ type: 'quiz', score: 80, meta: { source: 'x' } }];
    const copy = JSON.stringify(events);
    m.assessProfessionalReadiness(events);
    assert.strictEqual(JSON.stringify(events), copy);
  });
});
