'use strict';

/**
 * Canonical action lifecycle.
 *
 * proposed
 *   -> approval_required
 *   -> approved
 *   -> queued
 *   -> executing
 *   -> completed
 *   -> verified
 *
 * Failure may occur from queued/executing.
 */

const TRANSITIONS = {
  proposed: ['approval_required', 'approved'],
  approval_required: ['approved', 'rejected'],
  approved: ['queued', 'rejected'],
  queued: ['executing', 'failed'],
  executing: ['completed', 'failed'],
  completed: ['verified', 'failed'],
  verified: [],
  rejected: [],
  failed: ['queued']
};

function canTransition(from, to) {
  return Boolean(
    TRANSITIONS[from] &&
    TRANSITIONS[from].includes(to)
  );
}

function transition(action, nextStatus, metadata = {}) {
  if (!action || !action.status) {
    throw new Error('action.status is required');
  }

  if (!canTransition(action.status, nextStatus)) {
    throw new Error(
      `Invalid action transition: ${action.status} -> ${nextStatus}`
    );
  }

  return {
    ...action,
    status: nextStatus,
    lifecycle: [
      ...(action.lifecycle || []),
      {
        from: action.status,
        to: nextStatus,
        at: new Date().toISOString(),
        ...metadata
      }
    ]
  };
}

module.exports = {
  TRANSITIONS,
  canTransition,
  transition
};
