'use strict';

/**
 * Canonical decision generation.
 *
 * Domain adapters provide facts.
 * This layer produces a structured decision candidate.
 */

function generateDecision(input = {}) {
  const risk = input.risk || {};
  const findings = Array.isArray(input.findings)
    ? input.findings
    : [];

  let recommendation = 'monitor';

  if (risk.level === 'critical') {
    recommendation = 'escalate';
  } else if (risk.level === 'high') {
    recommendation = 'review';
  } else if (findings.length > 0) {
    recommendation = 'investigate';
  }

  return {
    id: input.id || `decision-${Date.now()}`,
    status: 'proposed',
    recommendation,
    risk,
    findingCount: findings.length,
    requiresApproval: recommendation !== 'monitor',
    createdAt: new Date().toISOString()
  };
}

module.exports = {
  generateDecision
};
