'use strict';

const {
  keyFor,
  seen,
  record,
  get
} = require('./idempotency');

const {
  canExecute
} = require('./governance');

function createAction(input = {}) {
  return {
    id: input.id ||
      `action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,

    decisionId: input.decisionId || null,

    type: input.type || 'CONTROL_PLANE_ACTION',

    status: 'proposed',

    payload: input.payload || {},

    createdAt: new Date().toISOString()
  };
}

function executeAction(action, governance, executor) {
  const key = keyFor({
    actionId: action.id,
    requestId: action.requestId
  });

  if (seen(key)) {
    return {
      duplicate: true,
      result: get(key)
    };
  }

  if (!canExecute(governance)) {
    return {
      executed: false,
      blocked: true,
      reason: 'approval-required'
    };
  }

  const result = executor
    ? executor(action)
    : {
        simulated: true,
        actionId: action.id
      };

  const output = {
    executed: true,
    result
  };

  record(key || action.id, output);

  return output;
}

module.exports = {
  createAction,
  executeAction
};
