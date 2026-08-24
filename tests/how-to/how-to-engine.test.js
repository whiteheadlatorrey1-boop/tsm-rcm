'use strict';

const assert = require('assert');

const {
  buildHowTo,
  listWorkflows,
  listReports,
  listPainPoints,
  STEPS
} = require('../../server/how-to/how-to-engine');

const workflow = buildHowTo({
  vertical: 'healthcare',
  workflow: 'denial_recovery',
  painPoint: 'revenue_leakage'
});

assert(workflow, 'Healthcare denial recovery workflow should exist');

assert.deepStrictEqual(
  workflow.steps,
  [
    'problem',
    'start',
    'input',
    'analyze',
    'review',
    'decide',
    'execute',
    'report',
    'measure'
  ]
);

assert(workflow.problem);
assert(workflow.start.length);
assert(workflow.input.length);
assert(workflow.analyze.length);
assert(workflow.review.length);
assert(workflow.decide.length);
assert(workflow.execute.length);
assert(workflow.reports.length);
assert(workflow.measures.length);

assert(
  workflow.reports.some(
    report => report.id === 'healthcare.denial_recovery'
  ),
  'Denial Recovery Report should be registered'
);

assert(
  workflow.painPoint &&
  workflow.painPoint.id === 'revenue_leakage'
);

assert(
  listWorkflows().length >= 10,
  'Expected seeded workflows'
);

assert(
  listReports().length >= 20,
  'Expected seeded reports'
);

assert(
  listPainPoints().length >= 5,
  'Expected seeded pain points'
);

console.log('TSM HOW-TO ENGINE TESTS PASSED');
console.log(`Workflows: ${listWorkflows().length}`);
console.log(`Reports: ${listReports().length}`);
console.log(`Pain points: ${listPainPoints().length}`);
console.log(`Steps: ${STEPS.length}`);
