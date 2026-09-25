'use strict';

/**
 * Technician Action Gate — reusable confirm-then-execute state machine.
 *
 * ACTION GENERATED -> ACTION PREVIEW -> TECHNICIAN CONFIRMATION -> AUTHORIZED SERVER ACTION
 *
 * Critical rule: generating or changing an action always resets confirmation.
 * This module holds no ServiceNow/network code and does not persist state —
 * callers own storage. It only enforces the shape and transition rules.
 */

const ACTION_TYPES = Object.freeze([
  'RESOLUTION_WRITE',
  'RETURN_TO_INVENTORY',
  'CREATE_REPLACEMENT',
  'HARDWARE_SWAP',
  'LOANER_RETURN',
  'WARRANTY_DEPOT_RETURN',
  'DEVICE_REASSIGNMENT',
  'ESCALATION',
  'CLOUD_OPS_HANDOFF'
]);

const STATES = Object.freeze({
  GENERATED: 'GENERATED',
  PREVIEWED: 'PREVIEWED',
  CONFIRMED: 'CONFIRMED',
  EXECUTED: 'EXECUTED'
});

function assertActionType(actionType) {
  if (!ACTION_TYPES.includes(actionType)) {
    const err = new Error(`Unknown action type "${actionType}". Must be one of: ${ACTION_TYPES.join(', ')}`);
    err.code = 'UNKNOWN_ACTION_TYPE';
    throw err;
  }
}

/**
 * generateAction(input) -> a new action record in GENERATED state.
 *
 * input: { actionType, payload, technician, sourceIncident, asset }
 * payload is the candidate data for this action (template-substituted
 * fields, etc.) — this module does not interpret its contents.
 */
function generateAction(input = {}) {
  const { actionType, payload, technician, sourceIncident, asset } = input;
  assertActionType(actionType);
  if (!technician || typeof technician !== 'object' || !technician.id) {
    const err = new Error('generateAction requires technician: { id, label? }');
    err.code = 'MISSING_TECHNICIAN';
    throw err;
  }

  return {
    actionType,
    payload: payload || {},
    technician: { id: technician.id, label: technician.label || null },
    sourceIncident: sourceIncident || null,
    asset: asset || null,
    state: STATES.GENERATED,
    confirmed: false,
    generatedAt: new Date().toISOString(),
    confirmedAt: null,
    executedAt: null,
    executionResult: null
  };
}

/**
 * previewAction(action) -> same action, marked PREVIEWED.
 * Call this once the technician has been shown the generated action.
 * Does not itself require confirmation.
 */
function previewAction(action) {
  requireState(action, [STATES.GENERATED, STATES.PREVIEWED]);
  return { ...action, state: STATES.PREVIEWED };
}

/**
 * confirmAction(action) -> action with confirmed: true, state CONFIRMED.
 * Only valid from PREVIEWED. Any call to generateAction/regenerate after
 * this must produce a fresh action (confirmed: false) — callers should
 * never mutate a confirmed action's payload in place.
 */
function confirmAction(action) {
  requireState(action, [STATES.PREVIEWED]);
  return {
    ...action,
    state: STATES.CONFIRMED,
    confirmed: true,
    confirmedAt: new Date().toISOString()
  };
}

/**
 * executeAction(action, executor) -> awaits executor(action), then returns
 * the action in EXECUTED state with executionResult set.
 *
 * executor is supplied by the caller (e.g. a function that calls
 * snAdapter.writeWorkNote). This module never talks to ServiceNow itself —
 * it only refuses to call executor unless state is CONFIRMED.
 */
async function executeAction(action, executor) {
  requireState(action, [STATES.CONFIRMED]);
  if (typeof executor !== 'function') {
    const err = new Error('executeAction requires an executor function');
    err.code = 'MISSING_EXECUTOR';
    throw err;
  }
  const result = await executor(action);
  return {
    ...action,
    state: STATES.EXECUTED,
    executedAt: new Date().toISOString(),
    executionResult: result
  };
}

function requireState(action, allowed) {
  if (!action || !allowed.includes(action.state)) {
    const err = new Error(
      `Action is in state "${action && action.state}", expected one of: ${allowed.join(', ')}`
    );
    err.code = 'INVALID_STATE_TRANSITION';
    throw err;
  }
}

module.exports = {
  ACTION_TYPES,
  STATES,
  generateAction,
  previewAction,
  confirmAction,
  executeAction
};
