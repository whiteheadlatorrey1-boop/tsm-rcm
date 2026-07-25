// confidence.js
// Confidence is a computed number, never something the LLM is asked to
// invent. Every term here is inspectable and each has a clear reason for
// its weight.

const { getHistoricalPrecision } = require('./decisions-store');

function daysSince(timestamp) {
  return Math.abs(new Date() - new Date(timestamp)) / (1000 * 60 * 60 * 24);
}

/**
 * @param {object} ruleResult - output of a rule's evaluate()
 * @returns {number} confidence between 0 and 1, rounded to 2 decimals
 */
function computeConfidence(ruleResult) {
  const rawScore = ruleResult.rawScore ?? 0;                 // how strong the match itself is
  const matchFactor = Math.min(1, ruleResult.matchedEventIds.length / 3); // more corroborating events = more confidence
  const mostRecentMatch = ruleResult.matchedEvents
    .map(e => daysSince(e.timestamp))
    .reduce((min, d) => Math.min(min, d), Infinity);
  const recencyFactor = Math.max(0, 1 - mostRecentMatch / 90);  // stale matches count for less
  const historicalPrecision = getHistoricalPrecision(ruleResult.rule_id); // improves as humans review outcomes

  const confidence =
    0.5 * rawScore +
    0.25 * matchFactor +
    0.15 * recencyFactor +
    0.10 * historicalPrecision;

  return Math.round(Math.min(1, Math.max(0, confidence)) * 100) / 100;
}

module.exports = { computeConfidence };
