'use strict';

const {
  REQUISITION_STATES
} = require('./tsm-ats-hris-wfm-contract');

const VERSION = '13B.0';

function normalize(input = {}) {
  if (!input.requisitionId) {
    throw new Error('requisitionId is required');
  }

  return {
    requisitionId: String(input.requisitionId),
    accountId: String(input.accountId || ''),
    title: String(input.title || ''),
    description: String(input.description || ''),
    state: input.state || 'draft',
    openings: Number.isFinite(input.openings)
      ? input.openings
      : 1,
    requiredCompetencies: Array.isArray(input.requiredCompetencies)
      ? [...input.requiredCompetencies]
      : [],
    evidenceRefs: Array.isArray(input.evidenceRefs)
      ? [...input.evidenceRefs]
      : []
  };
}

function transition(requisition, nextState, actorId) {
  if (!REQUISITION_STATES.includes(nextState)) {
    throw new Error(`invalid requisition state: ${nextState}`);
  }

  const current = normalize(requisition);

  const allowed = {
    draft: ['open', 'cancelled'],
    open: ['on_hold', 'filled', 'cancelled', 'closed'],
    on_hold: ['open', 'cancelled', 'closed'],
    filled: ['closed'],
    cancelled: [],
    closed: []
  };

  if (!allowed[current.state].includes(nextState)) {
    throw new Error(
      `invalid requisition transition: ${current.state} -> ${nextState}`
    );
  }

  return {
    ...current,
    state: nextState,
    lastActorId: String(actorId || ''),
    transitionedAt: new Date().toISOString()
  };
}

module.exports = {
  VERSION,
  normalize,
  transition
};
