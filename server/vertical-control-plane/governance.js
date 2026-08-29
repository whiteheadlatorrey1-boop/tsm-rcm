'use strict';

/**
 * Governance gate.
 *
 * No action is considered executable merely because an AI/strategy
 * layer recommended it.
 */

function createApprovalGate(input = {}) {
  const approvalRequired =
    input.approvalRequired !== false;

  return {
    approvalRequired,
    approved: Boolean(input.approved),
    approvedBy: input.approvedBy || null,
    approvedAt: input.approvedAt || null,
    reason: input.reason || null
  };
}

function canExecute(governance = {}) {
  if (!governance.approvalRequired) return true;

  return governance.approved === true;
}

function approve(governance, actor) {
  return {
    ...governance,
    approved: true,
    approvedBy: actor || null,
    approvedAt: new Date().toISOString()
  };
}

module.exports = {
  createApprovalGate,
  canExecute,
  approve
};
