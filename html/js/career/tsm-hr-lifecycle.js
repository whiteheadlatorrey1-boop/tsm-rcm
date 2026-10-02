'use strict';

/*
 * TSM Phase 11B — Employee Lifecycle.
 *
 * Deterministic lifecycle model.
 * HR owns employment lifecycle.
 * Staffing owns placement lifecycle.
 */

var VERSION = '11B.0';

var STATES = [
  'prehire',
  'active',
  'leave',
  'offboarding',
  'ended'
];

var ALLOWED = {
  prehire: ['active', 'offboarding'],
  active: ['leave', 'offboarding'],
  leave: ['active', 'offboarding'],
  offboarding: ['ended'],
  ended: []
};

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function canTransition(from, to) {
  from = clean(from);
  to = clean(to);

  if (STATES.indexOf(from) < 0 || STATES.indexOf(to) < 0) {
    return false;
  }

  return ALLOWED[from].indexOf(to) >= 0;
}

function transition(state, nextState) {
  var from = clean(state);
  var to = clean(nextState);

  if (!canTransition(from, to)) {
    throw new Error(
      'invalid HR lifecycle transition: ' + from + ' -> ' + to
    );
  }

  return {
    from: from,
    to: to
  };
}

function createLifecycle(workerId) {
  return {
    workerId: clean(workerId),
    state: 'prehire',
    history: []
  };
}

function applyTransition(lifecycle, nextState, actorId) {
  lifecycle = lifecycle || createLifecycle();
  var result = transition(lifecycle.state, nextState);

  var next = {
    workerId: lifecycle.workerId,
    state: result.to,
    history: Array.isArray(lifecycle.history)
      ? lifecycle.history.slice()
      : []
  };

  next.history.push({
    from: result.from,
    to: result.to,
    actorId: clean(actorId) || null
  });

  return next;
}

module.exports = {
  VERSION: VERSION,
  STATES: STATES.slice(),
  canTransition: canTransition,
  transition: transition,
  createLifecycle: createLifecycle,
  applyTransition: applyTransition
};
