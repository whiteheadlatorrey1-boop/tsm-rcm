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

describe('Phase 0.5 — RCM candidate context contract', function () {
  const rcmEngine = require(
    '../../html/js/career/tsm-rcm-career-engine.js'
  );

  it('exports setCandidateContext', function () {
    assert.strictEqual(
      typeof rcmEngine.setCandidateContext,
      'function'
    );
  });

  it('exports clearCandidateContext', function () {
    assert.strictEqual(
      typeof rcmEngine.clearCandidateContext,
      'function'
    );
  });

  it('returns null when no candidate context is active', function () {
    rcmEngine.clearCandidateContext();

    assert.strictEqual(
      rcmEngine.getCandidateContext(),
      null
    );
  });

  it('accepts a valid candidate context', function () {
    rcmEngine.setCandidateContext('cand_test');

    assert.deepStrictEqual(
      rcmEngine.getCandidateContext(),
      {
        candidateId: 'cand_test'
      }
    );

    rcmEngine.clearCandidateContext();
  });

  it('rejects an empty candidate identifier', function () {
    assert.throws(
      () => rcmEngine.setCandidateContext(''),
      /candidateId is required/
    );
  });

  it('rejects a non-string candidate identifier', function () {
    assert.throws(
      () => rcmEngine.setCandidateContext(null),
      /candidateId is required/
    );
  });

  it('trims the candidate identifier', function () {
    rcmEngine.setCandidateContext('  cand_test  ');

    assert.deepStrictEqual(
      rcmEngine.getCandidateContext(),
      {
        candidateId: 'cand_test'
      }
    );

    rcmEngine.clearCandidateContext();
  });
});

describe('Phase 0.5 — RCM Registry write-through contract', function () {
  const rcmEngine = require(
    '../../html/js/career/tsm-rcm-career-engine.js'
  );

  it('does not require Candidate Registry when no candidate context is active', function () {
    rcmEngine.clearCandidateContext();

    const attempt = rcmEngine.recordAttempt({
      domain: 'rcm',
      concept: 'denial_recovery',
      competency: 'denial_resolution',
      score: 0.88,
      scenario: 'test_no_candidate_context',
      source: 'phase0.5_test'
    });

    assert.strictEqual(attempt.competency, 'denial_resolution');
    assert.strictEqual(attempt.score, 0.88);
  });

  it('preserves the local RCM attempt when candidate context is active', function () {
    rcmEngine.setCandidateContext('cand_test');

    const attempt = rcmEngine.recordAttempt({
      domain: 'rcm',
      concept: 'denial_recovery',
      competency: 'appeal_strategy',
      score: 0.91,
      scenario: 'test_candidate_context',
      source: 'phase0.5_test'
    });

    assert.strictEqual(attempt.competency, 'appeal_strategy');
    assert.strictEqual(attempt.score, 0.91);

    rcmEngine.clearCandidateContext();
  });

  it('writes the RCM attempt through to Candidate Registry when candidate context is active', function () {
    rcmEngine.setCandidateContext('cand_write_through');

    const originalBridge = global.TSMCandidateRegistryBridge;

    let captured = null;

    global.TSMCandidateRegistryBridge = {
      recordRcmAttempt: function (candidateId, attempt) {
        captured = {
          candidateId,
          attempt
        };

        return Promise.resolve({
          candidateId: candidateId
        });
      }
    };

    try {
      const attempt = rcmEngine.recordAttempt({
        domain: 'rcm',
        concept: 'denial_recovery',
        competency: 'appeal_strategy',
        score: 0.93,
        scenario: 'test_write_through',
        source: 'phase0.5_write_through_test',
        metadata: {
          test: true
        }
      });

      assert.strictEqual(attempt.score, 0.93);
      assert.ok(captured);
      assert.strictEqual(
        captured.candidateId,
        'cand_write_through'
      );
      assert.strictEqual(
        captured.attempt.id,
        attempt.id
      );
      assert.strictEqual(
        captured.attempt.competency,
        'appeal_strategy'
      );
      assert.strictEqual(
        captured.attempt.score,
        93
      );
      assert.strictEqual(
        captured.attempt.scenario,
        'test_write_through'
      );
    } finally {
      global.TSMCandidateRegistryBridge = originalBridge;
      rcmEngine.clearCandidateContext();
    }
  });

  it('isolates a synchronous Candidate Registry bridge failure', function () {
    rcmEngine.setCandidateContext('cand_sync_failure');

    const originalBridge = global.TSMCandidateRegistryBridge;

    global.TSMCandidateRegistryBridge = {
      recordRcmAttempt: function () {
        throw new Error('simulated synchronous Registry failure');
      }
    };

    try {
      const attempt = rcmEngine.recordAttempt({
        domain: 'rcm',
        concept: 'failure_isolation',
        competency: 'sync_failure',
        score: 0.86,
        scenario: 'test_sync_registry_failure',
        source: 'phase0.5_failure_test'
      });

      assert.strictEqual(attempt.competency, 'sync_failure');
      assert.strictEqual(attempt.score, 0.86);
      assert.strictEqual(
        attempt.scenario,
        'test_sync_registry_failure'
      );
    } finally {
      global.TSMCandidateRegistryBridge = originalBridge;
      rcmEngine.clearCandidateContext();
    }
  });

  it('isolates an asynchronous Candidate Registry rejection', async function () {
    rcmEngine.setCandidateContext('cand_async_failure');

    const originalBridge = global.TSMCandidateRegistryBridge;

    global.TSMCandidateRegistryBridge = {
      recordRcmAttempt: function () {
        return Promise.reject(
          new Error('simulated asynchronous Registry failure')
        );
      }
    };

    try {
      const attempt = rcmEngine.recordAttempt({
        domain: 'rcm',
        concept: 'failure_isolation',
        competency: 'async_failure',
        score: 0.82,
        scenario: 'test_async_registry_failure',
        source: 'phase0.5_failure_test'
      });

      assert.strictEqual(attempt.competency, 'async_failure');
      assert.strictEqual(attempt.score, 0.82);
      assert.strictEqual(
        attempt.scenario,
        'test_async_registry_failure'
      );

      /*
       * Allow the rejected Promise handler installed by the engine
       * to execute before the test finishes.
       */
      await new Promise(function (resolve) {
        setImmediate(resolve);
      });
    } finally {
      global.TSMCandidateRegistryBridge = originalBridge;
      rcmEngine.clearCandidateContext();
    }
  });

  it('does not fail the RCM attempt when Candidate Registry is unavailable', function () {
    rcmEngine.setCandidateContext('cand_test');

    const originalBridge = global.TSMCandidateRegistryBridge;
    delete global.TSMCandidateRegistryBridge;

    try {
      const attempt = rcmEngine.recordAttempt({
        domain: 'rcm',
        concept: 'revenue_leakage',
        competency: 'leakage_detection',
        score: 0.84,
        scenario: 'test_bridge_unavailable',
        source: 'phase0.5_test'
      });

      assert.strictEqual(attempt.competency, 'leakage_detection');
      assert.strictEqual(attempt.score, 0.84);
    } finally {
      global.TSMCandidateRegistryBridge = originalBridge;
      rcmEngine.clearCandidateContext();
    }
  });
});
