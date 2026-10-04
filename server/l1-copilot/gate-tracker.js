'use strict';

/**
 * TSM L1 COPILOT — GATE TRACKER (Phase 1B, pure, unwired)
 *
 * Reports, for a ticket snapshot and an optional technician action, which
 * gate is currently blocking on two independent tracks:
 *
 *   closure   -> wraps closure-gate.evaluateClosure (state + required evidence)
 *   execution -> reads action-gate state (GENERATED -> PREVIEWED -> CONFIRMED -> EXECUTED)
 *
 * Confirmation is owned by action-gate. This module never accepts a separate
 * "confirmed" flag from the caller and never treats action.references as
 * evidence or authorization.
 *
 * No I/O, no ServiceNow, no engine coupling, no mutation of inputs.
 */

const { evaluateClosure } = require('./closure-gate');
const { STATES: ACTION_STATES } = require('./action-gate');

const GATES = Object.freeze({
  WORKFLOW_STATE: 'WORKFLOW_STATE',
  EVIDENCE: 'EVIDENCE',
  CLOSE_READY: 'CLOSE_READY',
  ACTION_REQUIRED: 'ACTION_REQUIRED',
  ACTION_PREVIEW: 'ACTION_PREVIEW',
  TECHNICIAN_CONFIRMATION: 'TECHNICIAN_CONFIRMATION',
  EXECUTION_AUTHORIZED: 'EXECUTION_AUTHORIZED',
  ALREADY_EXECUTED: 'ALREADY_EXECUTED',
  INVALID_ACTION: 'INVALID_ACTION'
});

function evaluateClosureGate(input = {}) {
  const closure = evaluateClosure(input);
  const missingEvidence = closure.missingEvidence.map(item => ({ ...item }));

  let gate;
  if (closure.state !== 'IN PROGRESS') {
    gate = GATES.WORKFLOW_STATE;
  } else if (missingEvidence.length) {
    gate = GATES.EVIDENCE;
  } else {
    gate = GATES.CLOSE_READY;
  }

  return {
    state: closure.state,
    taskType: closure.taskType,
    gate,
    readyForClosure: closure.readyForClosure,
    nextEvidence: missingEvidence.length ? missingEvidence[0].key : null,
    missingEvidence,
    reason: closure.reason
  };
}

function evaluateExecutionGate(action) {
  if (!action || typeof action !== 'object') {
    return {
      gate: GATES.ACTION_REQUIRED,
      allowed: false,
      actionState: null,
      reason: 'No technician action has been generated.'
    };
  }

  switch (action.state) {
    case ACTION_STATES.GENERATED:
      return {
        gate: GATES.ACTION_PREVIEW,
        allowed: false,
        actionState: action.state,
        reason: 'Action must be previewed to the technician before confirmation.'
      };
    case ACTION_STATES.PREVIEWED:
      return {
        gate: GATES.TECHNICIAN_CONFIRMATION,
        allowed: false,
        actionState: action.state,
        reason: 'Technician confirmation is required before execution.'
      };
    case ACTION_STATES.CONFIRMED:
      if (action.confirmed !== true) {
        return {
          gate: GATES.INVALID_ACTION,
          allowed: false,
          actionState: action.state,
          reason: 'Action reports CONFIRMED state without confirmed=true.'
        };
      }
      return {
        gate: GATES.EXECUTION_AUTHORIZED,
        allowed: true,
        actionState: action.state,
        reason: 'Technician has confirmed this action.'
      };
    case ACTION_STATES.EXECUTED:
      return {
        gate: GATES.ALREADY_EXECUTED,
        allowed: false,
        actionState: action.state,
        reason: 'Action has already been executed.'
      };
    default:
      return {
        gate: GATES.INVALID_ACTION,
        allowed: false,
        actionState: action.state === undefined ? null : action.state,
        reason: 'Action is in an unrecognized state.'
      };
  }
}

/**
 * evaluateGates({ state, taskType?, shortDescription?, description?,
 *                 category?, subcategory?, evidence?, action? })
 */
function evaluateGates(input = {}) {
  const closure = evaluateClosureGate(input);
  const execution = evaluateExecutionGate(input.action);

  return {
    state: closure.state,
    taskType: closure.taskType,
    closure,
    execution,
    technicianAuthority: true,
    autonomousCloseAllowed: false
  };
}

module.exports = {
  GATES,
  evaluateClosureGate,
  evaluateExecutionGate,
  evaluateGates
};
