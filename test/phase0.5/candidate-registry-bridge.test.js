'use strict';

const assert = require('assert');
const {
  describe,
  it,
  beforeEach,
  afterEach
} = require('node:test');

describe('Phase 0.5 — Candidate Registry Bridge', function () {
  let bridge;
  let originalFetch;

  beforeEach(function () {
    delete require.cache[
      require.resolve('../../html/js/career/tsm-candidate-registry-bridge.js')
    ];

    bridge = require(
      '../../html/js/career/tsm-candidate-registry-bridge.js'
    );

    originalFetch = global.fetch;
  });

  afterEach(function () {
    global.fetch = originalFetch;
  });

  it('exports the registry bridge API', function () {
    assert.strictEqual(typeof bridge.getCandidate, 'function');
    assert.strictEqual(typeof bridge.listCandidates, 'function');
    assert.strictEqual(typeof bridge.recordTrainingEvent, 'function');
  });

  it('requires candidateId for candidate reads', function () {
    assert.throws(
      () => bridge.getCandidate(),
      /candidateId is required/
    );
  });

  it('requires candidateId for training events', function () {
    assert.throws(
      () => bridge.recordTrainingEvent(null, {
        type: 'quiz',
        score: 90
      }),
      /candidateId is required/
    );
  });

  it('requires a training event type', function () {
    assert.throws(
      () => bridge.recordTrainingEvent('cand_test', {
        score: 90
      }),
      /training event type is required/
    );
  });

  it('posts training events to the candidate registry', async function () {
    let captured = null;

    global.fetch = async function (url, options) {
      captured = {
        url,
        options
      };

      return {
        ok: true,
        json: async function () {
          return {
            candidate: {
              candidateId: 'cand_test',
              readinessScore: 90
            }
          };
        }
      };
    };

    const candidate = await bridge.recordTrainingEvent(
      'cand_test',
      {
        type: 'quiz',
        score: 90,
        weight: 2,
        meta: {
          module: 'professional_readiness'
        }
      }
    );

    assert.strictEqual(
      captured.url,
      '/api/candidates/cand_test/training-events'
    );

    assert.strictEqual(
      captured.options.method,
      'POST'
    );

    assert.strictEqual(
      captured.options.credentials,
      'same-origin'
    );

    assert.deepStrictEqual(
      JSON.parse(captured.options.body),
      {
        type: 'quiz',
        score: 90,
        weight: 2,
        meta: {
          module: 'professional_readiness'
        }
      }
    );

    assert.deepStrictEqual(candidate, {
      candidateId: 'cand_test',
      readinessScore: 90
    });
  });

  it('reads a candidate from the registry', async function () {
    let requestedUrl = null;

    global.fetch = async function (url) {
      requestedUrl = url;

      return {
        ok: true,
        json: async function () {
          return {
            candidate: {
              candidateId: 'cand_123',
              name: 'Test Candidate'
            }
          };
        }
      };
    };

    const candidate = await bridge.getCandidate('cand_123');

    assert.strictEqual(
      requestedUrl,
      '/api/candidates/cand_123'
    );

    assert.deepStrictEqual(candidate, {
      candidateId: 'cand_123',
      name: 'Test Candidate'
    });
  });

  it('lists candidates with an optional status filter', async function () {
    let requestedUrl = null;

    global.fetch = async function (url) {
      requestedUrl = url;

      return {
        ok: true,
        json: async function () {
          return {
            candidates: [
              {
                candidateId: 'cand_ready',
                status: 'ready_for_placement'
              }
            ]
          };
        }
      };
    };

    const candidates = await bridge.listCandidates({
      status: 'ready_for_placement'
    });

    assert.strictEqual(
      requestedUrl,
      '/api/candidates?status=ready_for_placement'
    );

    assert.deepStrictEqual(candidates, [
      {
        candidateId: 'cand_ready',
        status: 'ready_for_placement'
      }
    ]);
  });

  it('surfaces registry API errors', async function () {
    global.fetch = async function () {
      return {
        ok: false,
        json: async function () {
          return {
            error: 'Candidate not found'
          };
        }
      };
    };

    await assert.rejects(
      () => bridge.getCandidate('cand_missing'),
      /Candidate not found/
    );
  });
});

describe('Phase 0.5 — RCM bridge mapping', function () {
  const bridge = require(
    '../../html/js/career/tsm-candidate-registry-bridge.js'
  );

  it('exports an RCM attempt mapper', function () {
    assert.strictEqual(
      typeof bridge.mapRcmAttempt,
      'function'
    );
  });

  it('maps an RCM attempt into a registry event', function () {
    const event = bridge.mapRcmAttempt({
      domain: 'rcm',
      concept: 'denial_recovery',
      competency: 'appeal_reasoning',
      score: 92,
      scenario: 'timely_filing',
      source: 'denial_recovery_career',
      metadata: {
        payer: 'Medicare'
      }
    });

    assert.deepStrictEqual(event, {
      type: 'career_training_attempt',
      score: 92,
      weight: 1,
      meta: {
        domain: 'rcm',
        concept: 'denial_recovery',
        competency: 'appeal_reasoning',
        scenario: 'timely_filing',
        source: 'denial_recovery_career',
        metadata: {
          payer: 'Medicare'
        }
      }
    });
  });

  it('preserves the RCM score exactly', function () {
    const event = bridge.mapRcmAttempt({
      score: 87.5
    });

    assert.strictEqual(event.score, 87.5);
  });

  it('rejects malformed RCM attempts', function () {
    assert.throws(
      () => bridge.mapRcmAttempt(null),
      /RCM attempt must be an object/
    );
  });

  it('rejects RCM attempts without numeric scores', function () {
    assert.throws(
      () => bridge.mapRcmAttempt({
        domain: 'rcm'
      }),
      /RCM attempt score must be numeric/
    );
  });

  it('exports recordRcmAttempt', function () {
    assert.strictEqual(
      typeof bridge.recordRcmAttempt,
      'function'
    );
  });
});
