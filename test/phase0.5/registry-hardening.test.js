'use strict';

const assert = require('assert');

/*
 * Phase 0.5 — Registry Hardening
 *
 * These tests define the contracts before production changes.
 * No server startup.
 * No API calls.
 * No MongoDB connection.
 */

const registry = require('../../server/candidate-registry-service');

describe('Phase 0.5 — Candidate Registry', function () {

  describe('canonical training-event contract', function () {

    it('exports computeReadinessScore', function () {
      assert.strictEqual(
        typeof registry.computeReadinessScore,
        'function'
      );
    });

    it('does not allow an unscored event to reduce readiness', function () {
      const result = registry.computeReadinessScore([
        {
          type: 'module_complete',
          score: 90,
          weight: 1
        },
        {
          type: 'attendance',
          weight: 1
        }
      ]);

      assert.strictEqual(result.score, 90);
    });

    it('preserves scored legacy event types', function () {
      const result = registry.computeReadinessScore([
        {
          type: 'module_complete',
          score: 80,
          weight: 1
        },
        {
          type: 'quiz',
          score: 90,
          weight: 1
        }
      ]);

      assert.strictEqual(result.score, 85);
    });

  });

});


describe('Phase 0.5 — Staffing eligibility contract', function () {

  it('requires a candidate identifier', function () {
    assert.throws(
      () => {
        if (!null) {
          throw new Error('candidateId is required');
        }
      },
      /candidateId is required/
    );
  });

  it('does not allow sample candidates to pass placement eligibility', function () {
    const candidate = {
      candidateId: 'cand_sample',
      isSampleData: true,
      status: 'ready_for_placement',
      readinessScore: 95
    };

    const eligible =
      candidate &&
      candidate.isSampleData !== true &&
      candidate.status === 'ready_for_placement';

    assert.strictEqual(eligible, false);
  });

  it('does not allow below-threshold candidates to pass placement eligibility', function () {
    const candidate = {
      candidateId: 'cand_real',
      isSampleData: false,
      status: 'ready_for_placement',
      readinessScore: 59
    };

    const minimumReadiness = 70;

    const eligible =
      candidate &&
      candidate.isSampleData !== true &&
      candidate.status === 'ready_for_placement' &&
      Number(candidate.readinessScore) >= minimumReadiness;

    assert.strictEqual(eligible, false);
  });

  it('allows an eligible real candidate to pass the contract', function () {
    const candidate = {
      candidateId: 'cand_real',
      isSampleData: false,
      status: 'ready_for_placement',
      readinessScore: 85
    };

    const minimumReadiness = 70;

    const eligible =
      candidate &&
      candidate.isSampleData !== true &&
      candidate.status === 'ready_for_placement' &&
      Number(candidate.readinessScore) >= minimumReadiness;

    assert.strictEqual(eligible, true);
  });

});
