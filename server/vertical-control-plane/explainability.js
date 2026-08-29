'use strict';

/**
 * Structured explanation layer.
 */

function explainDecision(decision = {}, evidence = []) {
  return {
    decisionId: decision.id || null,
    recommendation: decision.recommendation || null,

    rationale: [
      decision.risk?.level
        ? `Risk level is ${decision.risk.level}.`
        : 'Risk level unavailable.',

      Number.isFinite(decision.risk?.score)
        ? `Risk score is ${decision.risk.score}.`
        : 'Risk score unavailable.',

      decision.findingCount
        ? `${decision.findingCount} finding(s) contributed to the decision.`
        : 'No findings contributed to the decision.'
    ],

    evidence: evidence.map(item => ({
      id: item.id || null,
      source: item.source || null,
      sourceId: item.sourceId || null,
      confidence: item.confidence ?? null
    }))
  };
}

module.exports = {
  explainDecision
};
