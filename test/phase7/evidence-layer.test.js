'use strict';

const assert = require('assert');
const { describe, it } = require('node:test');
const layer = require('../../server/readiness/evidence-layer.js');
const model = require('../../server/readiness/professional-readiness-model.js');

const at = '2026-09-29T12:00:00.000Z';

describe('Phase 7B - Unified Evidence Layer', function () {
  it('every 7A-mapped event type has an evidence category (registries cannot drift)', function () {
    Object.keys(model.EVENT_MAP).forEach(function (type) {
      assert.ok(layer.TYPE_CATEGORY[type], 'no category for ' + type);
      assert.ok(layer.CATEGORIES.indexOf(layer.TYPE_CATEGORY[type]) !== -1, 'unknown category for ' + type);
    });
  });

  it('every categorized type exists in the 7A registry', function () {
    Object.keys(layer.TYPE_CATEGORY).forEach(function (type) {
      assert.ok(model.EVENT_MAP[type], 'not in 7A EVENT_MAP: ' + type);
    });
  });

  it('normalizes a scored event into the canonical record shape', function () {
    const r = layer.normalizeEvidence(
      [{ type: 'l1_resolution', score: 88, weight: 2, recordedAt: at, meta: { source: 'l1-copilot', category: 'Software/Access' } }],
      { candidateId: 'cand_1' }
    );
    assert.strictEqual(r.rejected.length, 0);
    const rec = r.records[0];
    assert.strictEqual(rec.candidateId, 'cand_1');
    assert.strictEqual(rec.category, 'it_l1');
    assert.strictEqual(rec.kind, 'operational');
    assert.strictEqual(rec.source, 'l1-copilot');
    assert.strictEqual(rec.recordedAt, at);
    assert.strictEqual(rec.score, 88);
    assert.strictEqual(rec.weight, 2);
    assert.strictEqual(rec.scored, true);
    assert.deepStrictEqual(rec.dimensions, { technical: 1, documentation: 1, reliability: 1 });
    assert.strictEqual(rec.summary.category, 'Software/Access');
    assert.ok(/^ev_[0-9a-f]{12}$/.test(rec.evidenceId));
  });

  it('RCM attempts are categorized as rcm, not generic training', function () {
    const r = layer.normalizeEvidence([{ type: 'career_training_attempt', score: 70 }], { candidateId: 'c' });
    assert.strictEqual(r.records[0].category, 'rcm');
  });

  it('unscored events are kept as records with score null (gaps stay visible)', function () {
    const r = layer.normalizeEvidence([{ type: 'quiz' }, { type: 'quiz', score: null }], { candidateId: 'c' });
    assert.strictEqual(r.records.length, 2);
    r.records.forEach(function (rec) { assert.strictEqual(rec.score, null); assert.strictEqual(rec.scored, false); });
  });

  it('unmapped and malformed events are rejected with a reason, never guessed', function () {
    const r = layer.normalizeEvidence(
      [{ type: 'mystery', score: 90 }, null, 'x', { score: 5 }, [], { type: '  ' }],
      { candidateId: 'c' }
    );
    assert.strictEqual(r.records.length, 0);
    assert.strictEqual(r.rejected.length, 6);
    assert.deepStrictEqual(r.rejected[0], { index: 0, type: 'mystery', reason: 'unmapped_event_type' });
    assert.strictEqual(r.rejected[1].reason, 'malformed_event');
  });

  it('verification is always system_recorded; client meta cannot self-verify', function () {
    const r = layer.normalizeEvidence(
      [{ type: 'quiz', score: 90, meta: { verified: true, verification: 'verified' } }],
      { candidateId: 'c' }
    );
    assert.strictEqual(r.records[0].verification, 'system_recorded');
  });

  it('evidenceId is deterministic and distinguishes otherwise identical events', function () {
    const ev = { type: 'quiz', score: 80, recordedAt: at };
    const a = layer.normalizeEvidence([ev, ev], { candidateId: 'c' }).records;
    const b = layer.normalizeEvidence([ev, ev], { candidateId: 'c' }).records;
    assert.strictEqual(a[0].evidenceId, b[0].evidenceId);
    assert.notStrictEqual(a[0].evidenceId, a[1].evidenceId);
  });

  it('scores are clamped to 0-100 and weight defaults to 1', function () {
    const r = layer.normalizeEvidence([{ type: 'quiz', score: -5, weight: 0 }], { candidateId: 'c' });
    assert.strictEqual(r.records[0].score, 0);
    assert.strictEqual(r.records[0].weight, 1);
  });

  it('non-array input yields empty output', function () {
    const r = layer.normalizeEvidence(undefined);
    assert.deepStrictEqual(r, { records: [], rejected: [] });
  });

  it('summary counts by category and reports gaps honestly', function () {
    const { records } = layer.normalizeEvidence([
      { type: 'quiz', score: 80, recordedAt: '2026-09-01T00:00:00.000Z' },
      { type: 'quiz', score: 90, recordedAt: '2026-09-10T00:00:00.000Z' },
      { type: 'quiz' },
      { type: 'l1_resolution', score: 70, recordedAt: at },
    ], { candidateId: 'c' });
    const s = layer.summarizeEvidence(records);
    assert.strictEqual(s.total, 4);
    assert.deepStrictEqual(s.byCategory.training, { total: 3, scored: 2, latest: '2026-09-10T00:00:00.000Z' });
    assert.strictEqual(s.byCategory.it_l1.scored, 1);
    assert.deepStrictEqual(s.categoriesWithEvidence, ['training', 'it_l1']);
    assert.ok(s.categoriesWithoutEvidence.indexOf('rcm') !== -1);
  });

  it('summary flags categories that no source can produce yet', function () {
    const s = layer.summarizeEvidence([]);
    ['interview', 'sap', 'healthcare', 'certification', 'work_project'].forEach(function (c) {
      assert.ok(s.categoriesWithoutSource.indexOf(c) !== -1, c + ' should be flagged as having no source');
    });
    assert.ok(s.categoriesWithoutSource.indexOf('training') === -1);
  });

  it('does not mutate its input', function () {
    const events = [{ type: 'quiz', score: 80, meta: { source: 'x' } }];
    const copy = JSON.stringify(events);
    layer.normalizeEvidence(events, { candidateId: 'c' });
    assert.strictEqual(JSON.stringify(events), copy);
  });
});
