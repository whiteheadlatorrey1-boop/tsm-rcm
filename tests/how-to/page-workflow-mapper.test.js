'use strict';

const assert = require('assert');

const {
  PAGE_WORKFLOW_REGISTRY,
  getPageWorkflow,
} = require('../../server/how-to/page-workflow-registry');

assert(PAGE_WORKFLOW_REGISTRY.length > 0);

const schools = getPageWorkflow(
  'html/war-rooms/schools-command/schools-command.html'
);

assert(schools, 'Schools workflow must be registered');

assert.equal(
  schools.vertical,
  'schools'
);

assert.equal(
  schools.workflow.problems[0],
  'grant compliance'
);

assert.equal(
  schools.workflow.reports.length,
  4
);

const phases = [
  'problem',
  'start',
  'input',
  'analyze',
  'review',
  'decide',
  'execute',
  'reports',
  'measure',
  'repeat',
];

for (const phase of phases) {
  assert(
    schools.workflow[phase],
    `Missing Schools workflow phase: ${phase}`
  );
}

console.log('TSM PAGE WORKFLOW MAPPER TEST PASSED');
console.log(`Pages: ${PAGE_WORKFLOW_REGISTRY.length}`);
console.log(`Schools reports: ${schools.workflow.reports.length}`);
console.log(
  `Schools analyze controls: ${schools.workflow.analyze.controls.length}`
);
