'use strict';

const assert = require('assert');

const {
  getGuidedWorkflow
} = require('../../server/how-to/guided-workflow-registry');

const workflow = getGuidedWorkflow('schools');

assert(workflow, 'Schools guided workflow must exist');
assert.strictEqual(workflow.vertical, 'schools');

assert.strictEqual(
  workflow.steps.length,
  9,
  'Schools workflow must have 9 operating steps'
);

const phases = workflow.steps.map(step => step.phase);

assert.deepStrictEqual(phases, [
  'START',
  'INPUT',
  'ANALYZE',
  'REVIEW',
  'DECIDE',
  'EXECUTE',
  'REPORT',
  'MEASURE',
  'REPEAT'
]);

assert(
  workflow.steps
    .find(step => step.phase === 'REPORT')
    .recommendedReports
    .includes('Executive Schools Brief')
);

console.log('TSM GUIDED HOW-TO TEST PASSED');
console.log('Schools steps:', workflow.steps.length);
console.log(
  'Recommended reports:',
  workflow.steps.find(x => x.phase === 'REPORT').recommendedReports.length
);
