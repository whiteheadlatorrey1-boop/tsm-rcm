'use strict';

const contract = require('./contract');
const evidence = require('./evidence');
const deterministic = require('./deterministic');
const risk = require('./risk');
const forecast = require('./forecast');
const decisions = require('./decisions');
const explainability = require('./explainability');
const governance = require('./governance');
const actions = require('./actions');
const audit = require('./audit');
const verification = require('./verification');
const writeback = require('./writeback');
const telemetry = require('./telemetry');
const persistence = require('./persistence');
const lifecycle = require('./lifecycle');
const predictive = require('./predictive');
const relationships = require('./relationships');
const production = require('./production');

module.exports = {
  ...contract,
  ...evidence,
  ...deterministic,
  ...risk,
  ...forecast,
  ...decisions,
  ...explainability,
  ...governance,
  ...actions,
  ...audit,
  ...verification,
  ...writeback,
  ...telemetry,
  ...persistence,
  ...lifecycle,
  ...predictive,
  ...relationships,
  ...production
};
