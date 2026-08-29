'use strict';

/**
 * Verification layer.
 */

function verifyDecision(decision = {}) {
  const checks = {
    hasId: Boolean(decision.id),
    hasRecommendation: Boolean(decision.recommendation),
    hasStatus: Boolean(decision.status),
    riskPresent: Boolean(decision.risk)
  };

  return {
    verified: Object.values(checks).every(Boolean),
    checks
  };
}

function verifyAction(action = {}) {
  const checks = {
    hasId: Boolean(action.id),
    hasDecision: Boolean(action.decisionId),
    hasStatus: Boolean(action.status)
  };

  return {
    verified: Object.values(checks).every(Boolean),
    checks
  };
}

module.exports = {
  verifyDecision,
  verifyAction
};
