'use strict';

/**
 * Decision telemetry.
 */

function decisionTelemetry(input = {}) {
  return {
    vertical: input.vertical || null,
    decisionId: input.decisionId || null,
    riskScore: input.riskScore ?? null,
    recommendation: input.recommendation || null,
    approvalRequired: Boolean(input.approvalRequired),
    approved: Boolean(input.approved),
    verified: Boolean(input.verified),
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  decisionTelemetry
};
