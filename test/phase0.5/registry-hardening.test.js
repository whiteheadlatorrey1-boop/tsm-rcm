'use strict';

const assert = require('assert');
const {
  describe,
  it,
  beforeEach,
  afterEach
} = require('node:test');

/*
 * Phase 0.5 — Registry Hardening
 *
 * These tests define the contracts before production changes.
 * No server startup.
 * No API calls.
 * No MongoDB connection.
 */

const registry = require('../../server/candidate-registry-service');
const staffing = require('../../server/staffing-engine-service');

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
    const result = staffing.evaluatePlacementEligibility({
      status: 'ready_for_placement',
      readinessScore: 85,
      isSampleData: false
    });

    assert.strictEqual(result.eligible, false);
    assert.strictEqual(result.reason, 'candidate-id-missing');
  });

  it('does not allow sample candidates to pass placement eligibility', function () {
    const result = staffing.evaluatePlacementEligibility({
      candidateId: 'cand_sample',
      isSampleData: true,
      status: 'ready_for_placement',
      readinessScore: 95
    });

    assert.strictEqual(result.eligible, false);
    assert.strictEqual(result.reason, 'sample-candidate');
  });

  it('does not allow below-threshold candidates to pass placement eligibility', function () {
    const result = staffing.evaluatePlacementEligibility({
      candidateId: 'cand_real',
      isSampleData: false,
      status: 'ready_for_placement',
      readinessScore: 59
    });

    assert.strictEqual(result.eligible, false);
    assert.strictEqual(result.reason, 'readiness-below-threshold');
  });

  it('allows an eligible real candidate to pass the contract', function () {
    const result = staffing.evaluatePlacementEligibility({
      candidateId: 'cand_real',
      isSampleData: false,
      status: 'ready_for_placement',
      readinessScore: 85
    });

    assert.strictEqual(result.eligible, true);
    assert.strictEqual(result.reason, 'eligible');
  });

  it('supports an explicit readiness threshold', function () {
    const result = staffing.evaluatePlacementEligibility(
      {
        candidateId: 'cand_real',
        isSampleData: false,
        status: 'ready_for_placement',
        readinessScore: 75
      },
      { minimumReadiness: 80 }
    );

    assert.strictEqual(result.eligible, false);
    assert.strictEqual(result.reason, 'readiness-below-threshold');
    assert.strictEqual(result.minimumReadiness, 80);
  });

  it('rejects an ineligible candidate before placement creation', async function () {
    const registryModule = require('../../server/candidate-registry-service');
    const originalGetCandidate = registryModule.getCandidate;

    registryModule.getCandidate = async () => ({
      candidateId: 'cand_sample',
      isSampleData: true,
      status: 'ready_for_placement',
      readinessScore: 95
    });

    try {
      await assert.rejects(
        () => staffing.submitCandidate({
          candidateId: 'cand_sample',
          jobOrderId: 'job_test'
        }),
        /Candidate is not eligible for placement: sample-candidate/
      );
    } finally {
      registryModule.getCandidate = originalGetCandidate;
    }
  });

  it('rejects below-threshold candidates before placement creation', async function () {
    const registryModule = require('../../server/candidate-registry-service');
    const originalGetCandidate = registryModule.getCandidate;

    registryModule.getCandidate = async () => ({
      candidateId: 'cand_real',
      isSampleData: false,
      status: 'ready_for_placement',
      readinessScore: 69
    });

    try {
      await assert.rejects(
        () => staffing.submitCandidate({
          candidateId: 'cand_real',
          jobOrderId: 'job_test'
        }),
        /Candidate is not eligible for placement: readiness-below-threshold/
      );
    } finally {
      registryModule.getCandidate = originalGetCandidate;
    }
  });

});

describe('Phase 0.5 — Training event contract', function () {

  it('exports a training-event normalizer', function () {
    assert.strictEqual(
      typeof registry.normalizeTrainingEvent,
      'function'
    );
  });

  it('requires an event type', function () {
    assert.throws(
      () => registry.normalizeTrainingEvent({
        score: 90
      }),
      /training event type is required/
    );
  });

  it('preserves an omitted score as unscored', function () {
    const event = registry.normalizeTrainingEvent({
      type: 'attendance'
    });

    assert.strictEqual(event.score, null);
    assert.strictEqual(event.scored, false);
  });

  it('accepts numeric scores', function () {
    const event = registry.normalizeTrainingEvent({
      type: 'quiz',
      score: 85
    });

    assert.strictEqual(event.score, 85);
    assert.strictEqual(event.scored, true);
  });

  it('rejects non-numeric scores', function () {
    assert.throws(
      () => registry.normalizeTrainingEvent({
        type: 'quiz',
        score: '85'
      }),
      /training event score must be numeric/
    );
  });

  it('defaults weight to one', function () {
    const event = registry.normalizeTrainingEvent({
      type: 'module_complete',
      score: 90
    });

    assert.strictEqual(event.weight, 1);
  });

  it('rejects zero or negative weights', function () {
    assert.throws(
      () => registry.normalizeTrainingEvent({
        type: 'quiz',
        score: 90,
        weight: 0
      }),
      /training event weight must be greater than zero/
    );
  });



  it('rejects malformed training events before persistence', async function () {
    await assert.rejects(
      () => registry.recordTrainingEvent('cand_test', {
        score: 90
      }),
      /training event type is required/
    );
  });

  it('rejects non-numeric training scores before persistence', async function () {
    await assert.rejects(
      () => registry.recordTrainingEvent('cand_test', {
        type: 'quiz',
        score: '90'
      }),
      /training event score must be numeric/
    );
  });

  it('preserves metadata', function () {
    const event = registry.normalizeTrainingEvent({
      type: 'simulation_complete',
      score: 92,
      meta: {
        module: 'rcm',
        scenario: 'denial_recovery'
      }
    });

    assert.deepStrictEqual(event.meta, {
      module: 'rcm',
      scenario: 'denial_recovery'
    });
  });

});
