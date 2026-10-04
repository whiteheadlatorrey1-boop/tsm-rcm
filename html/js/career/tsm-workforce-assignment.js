'use strict';

const {
  ASSIGNMENT_STATES
} = require('./tsm-ats-hris-wfm-contract');

const VERSION = '13F.0';

function create(input = {}) {
  if (!input.assignmentId) {
    throw new Error('assignmentId is required');
  }

  if (!input.workerId) {
    throw new Error('workerId is required');
  }

  return {
    assignmentId: String(input.assignmentId),
    workerId: String(input.workerId),
    accountId: String(input.accountId || ''),
    role: String(input.role || ''),
    start: input.start || null,
    end: input.end || null,
    state: 'planned',
    evidenceRefs: [],
    history: []
  };
}

function transition(assignment, nextState, actorId) {
  if (!ASSIGNMENT_STATES.includes(nextState)) {
    throw new Error(`invalid assignment state: ${nextState}`);
  }

  const allowed = {
    planned: ['scheduled', 'cancelled'],
    scheduled: ['active', 'cancelled'],
    active: ['completed', 'cancelled'],
    completed: [],
    cancelled: []
  };

  const current = String(assignment.state || 'planned');

  if (!allowed[current].includes(nextState)) {
    throw new Error(
      `invalid assignment transition: ${current} -> ${nextState}`
    );
  }

  return {
    ...assignment,
    state: nextState,
    history: [
      ...(assignment.history || []),
      {
        from: current,
        to: nextState,
        actorId: String(actorId || ''),
        at: new Date().toISOString()
      }
    ]
  };
}

module.exports = {
  VERSION,
  create,
  transition
};
