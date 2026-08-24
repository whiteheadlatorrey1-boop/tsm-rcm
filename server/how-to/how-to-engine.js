'use strict';

const {
  getWorkflow,
  getWorkflows,
  listWorkflows
} = require('./workflow-registry');

const {
  getReports,
  getReport,
  listReports
} = require('./report-registry');

const {
  getPainPoint,
  listPainPoints
} = require('./painpoint-registry');

const STEPS = [
  'problem',
  'start',
  'input',
  'analyze',
  'review',
  'decide',
  'execute',
  'report',
  'measure'
];

function buildHowTo({
  vertical,
  workflow,
  painPoint
}) {
  const definition = getWorkflow(vertical, workflow);

  if (!definition) {
    return null;
  }

  return {
    id: definition.id,
    vertical,
    workflow,
    title: definition.title,
    problem: definition.problem,
    start: definition.start || [],
    input: definition.input || [],
    analyze: definition.analyze || [],
    review: definition.review || [],
    decide: definition.decide || [],
    execute: definition.execute || [],
    reports: getReports(definition.reports),
    measures: definition.measures || [],
    painPoint: painPoint ? getPainPoint(painPoint) : null,
    steps: STEPS
  };
}

module.exports = {
  STEPS,
  buildHowTo,
  getWorkflow,
  getWorkflows,
  getReports,
  getReport,
  getPainPoint,
  listWorkflows,
  listReports,
  listPainPoints
};
