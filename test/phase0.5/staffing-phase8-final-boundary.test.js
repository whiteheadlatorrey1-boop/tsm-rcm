'use strict';

const assert = require('assert');

const readiness =
  require('../../html/js/career/tsm-candidate-readiness-adapter');

const matchInput =
  require('../../html/js/career/tsm-candidate-match-input');

const match =
  require('../../html/js/career/tsm-job-candidate-match');

const pipeline =
  require('../../html/js/career/tsm-staffing-pipeline-model');

describe('Phase 8 final integration boundary', function () {
  it('exposes the complete staffing chain', function () {
    assert.strictEqual(typeof readiness.toMatchInput, 'function');
    assert.ok(matchInput, 'candidate match-input module must load');
    assert.ok(match, 'job-candidate match module must load');

    assert.strictEqual(
      typeof pipeline.evaluateSubmissionGate,
      'function'
    );

    assert.strictEqual(
      typeof pipeline.validateTransition,
      'function'
    );

    assert.strictEqual(
      typeof pipeline.applyTransition,
      'function'
    );
  });

  it('does not permit arbitrary staffing stage transitions', function () {
    const result = pipeline.validateTransition(
      'qualified',
      'placed'
    );

    assert.strictEqual(
      result.ok === false || result.valid === false,
      true
    );
  });
});
