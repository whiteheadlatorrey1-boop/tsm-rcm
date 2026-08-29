'use strict';

/**
 * Deterministic aggregation layer.
 *
 * No LLM dependency.
 * Same input => same output.
 */

function numeric(values) {
  return values
    .map(Number)
    .filter(Number.isFinite);
}

function sum(values) {
  return numeric(values)
    .reduce((a, b) => a + b, 0);
}

function average(values) {
  const nums = numeric(values);
  return nums.length
    ? sum(nums) / nums.length
    : 0;
}

function max(values) {
  const nums = numeric(values);
  return nums.length
    ? Math.max(...nums)
    : 0;
}

function min(values) {
  const nums = numeric(values);
  return nums.length
    ? Math.min(...nums)
    : 0;
}

function aggregate(findings = [], exposures = []) {
  const severityValues = findings
    .map(x => x.severityScore)
    .filter(Number.isFinite);

  const exposureValues = exposures
    .map(x => x.amount)
    .filter(Number.isFinite);

  return {
    findingCount: findings.length,
    exposureCount: exposures.length,
    severity: {
      max: max(severityValues),
      average: average(severityValues)
    },
    exposure: {
      total: sum(exposureValues),
      max: max(exposureValues)
    }
  };
}

module.exports = {
  sum,
  average,
  max,
  min,
  aggregate
};
