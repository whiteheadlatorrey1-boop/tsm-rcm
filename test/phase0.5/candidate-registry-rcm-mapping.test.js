'use strict';

const assert = require('assert');
const {
  describe,
  it
} = require('node:test');

describe('Phase 0.5 — RCM to Candidate Registry mapping', function () {
  function mapRcmAttempt(attempt) {
    if (!attempt || typeof attempt !== 'object' || Array.isArray(attempt)) {
      throw new Error('RCM attempt must be an object');
    }

    if (typeof attempt.score !== 'number' || !Number.isFinite(attempt.score)) {
      throw new Error('RCM attempt score must be numeric');
    }

    return {
      type: 'career_training_attempt',
      score: attempt.score,
      weight: 1,
      meta: {
        domain: attempt.domain || 'rcm',
        concept: attempt.concept || 'general_rcm',
        competency: attempt.competency || 'general_rcm',
        scenario: attempt.scenario || null,
        source: attempt.source || 'career_command',
        metadata: attempt.metadata || {}
      }
    };
  }

  it('maps an RCM attempt into a registry training event', function () {
    const event = mapRcmAttempt({
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

  it('preserves the training score exactly', function () {
    const event = mapRcmAttempt({
      score: 87.5
    });

    assert.strictEqual(event.score, 87.5);
  });

  it('preserves domain and competency context', function () {
    const event = mapRcmAttempt({
      domain: 'ar_recovery',
      concept: 'recovery_action',
      competency: 'ar_prioritization',
      score: 88
    });

    assert.strictEqual(event.meta.domain, 'ar_recovery');
    assert.strictEqual(event.meta.concept, 'recovery_action');
    assert.strictEqual(event.meta.competency, 'ar_prioritization');
  });

  it('preserves scenario and source context', function () {
    const event = mapRcmAttempt({
      score: 90,
      scenario: 'high_balance_account',
      source: 'ar_recovery_career'
    });

    assert.strictEqual(
      event.meta.scenario,
      'high_balance_account'
    );

    assert.strictEqual(
      event.meta.source,
      'ar_recovery_career'
    );
  });

  it('rejects malformed RCM attempts', function () {
    assert.throws(
      () => mapRcmAttempt(null),
      /RCM attempt must be an object/
    );
  });

  it('rejects attempts without a numeric score', function () {
    assert.throws(
      () => mapRcmAttempt({
        domain: 'rcm'
      }),
      /RCM attempt score must be numeric/
    );
  });
});
