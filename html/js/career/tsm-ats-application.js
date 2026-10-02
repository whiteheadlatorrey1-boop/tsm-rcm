'use strict';

const {
  APPLICATION_STATES
} = require('./tsm-ats-hris-wfm-contract');

const VERSION = '13C.0';

function create(input = {}) {
  if (!input.applicationId) {
    throw new Error('applicationId is required');
  }

  if (!input.candidateId) {
    throw new Error('candidateId is required');
  }

  if (!input.requisitionId) {
    throw new Error('requisitionId is required');
  }

  return {
    applicationId: String(input.applicationId),
    candidateId: String(input.candidateId),
    requisitionId: String(input.requisitionId),
    state: 'draft',
    submittedAt: null,
    evidenceRefs: [],
    history: []
  };
}

function transition(application, nextState, actorId) {
  if (!APPLICATION_STATES.includes(nextState)) {
    throw new Error(`invalid application state: ${nextState}`);
  }

  const allowed = {
    draft: ['submitted', 'withdrawn'],
    submitted: ['screening', 'withdrawn', 'rejected'],
    screening: ['interview', 'assessment', 'rejected', 'withdrawn'],
    interview: ['assessment', 'offer', 'rejected', 'withdrawn'],
    assessment: ['interview', 'offer', 'rejected', 'withdrawn'],
    offer: ['hired', 'rejected', 'withdrawn'],
    hired: ['closed'],
    withdrawn: [],
    rejected: [],
    closed: []
  };

  const current = String(application.state || 'draft');

  if (!allowed[current].includes(nextState)) {
    throw new Error(
      `invalid application transition: ${current} -> ${nextState}`
    );
  }

  const event = {
    from: current,
    to: nextState,
    actorId: String(actorId || ''),
    at: new Date().toISOString()
  };

  return {
    ...application,
    state: nextState,
    submittedAt:
      nextState === 'submitted'
        ? new Date().toISOString()
        : application.submittedAt,
    history: [...(application.history || []), event]
  };
}

module.exports = {
  VERSION,
  create,
  transition
};
