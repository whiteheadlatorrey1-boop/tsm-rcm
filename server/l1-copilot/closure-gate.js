'use strict';

/**
 * TSM L1 COPILOT — CLOSURE READINESS GATE
 *
 * Governance boundary:
 *
 *   AI evaluates evidence
 *          ↓
 *   Closure Gate
 *          ↓
 *   READY / BLOCKED
 *          ↓
 *   Technician remains final authority
 *
 * This module never changes ServiceNow state.
 */

const {
  normalizeState,
  normalizeTaskType,
  classifyTask,
  getRequiredEvidence
} = require('./workflow-engine');

function evaluateClosure(input = {}) {
  const state = normalizeState(input.state);
  const taskType = input.taskType
    ? normalizeTaskType(input.taskType)
    : classifyTask(input).taskType;
  const evidence = input.evidence || {};

  const requiredEvidence = getRequiredEvidence(taskType);

  const missingEvidence = requiredEvidence
    .filter(requirement => evidence[requirement.key] !== true)
    .map(requirement => ({
      key: requirement.key,
      label: requirement.label
    }));

  if (state !== 'IN PROGRESS') {
    return {
      readyForClosure: false,
      closureStatus: 'BLOCKED',
      state,
      taskType,
      missingEvidence,
      reason: 'Ticket must be In Progress with required evidence before closure can be considered.',
      technicianAuthority: true,
      autonomousCloseAllowed: false
    };
  }

  if (missingEvidence.length) {
    return {
      readyForClosure: false,
      closureStatus: 'BLOCKED',
      state,
      taskType,
      missingEvidence,
      reason: 'Required evidence is incomplete.',
      technicianAuthority: true,
      autonomousCloseAllowed: false
    };
  }

  return {
    readyForClosure: true,
    closureStatus: 'READY FOR CLOSURE',
    state,
    taskType,
    missingEvidence: [],
    reason: 'Required evidence has been confirmed.',
    technicianAuthority: true,
    autonomousCloseAllowed: false
  };
}

function buildClosureChecklist(input = {}) {
  const taskType = input.taskType
    ? normalizeTaskType(input.taskType)
    : classifyTask(input).taskType;
  const evidence = input.evidence || {};

  return getRequiredEvidence(taskType).map(requirement => ({
    key: requirement.key,
    label: requirement.label,
    confirmed: evidence[requirement.key] === true
  }));
}

module.exports = {
  evaluateClosure,
  buildClosureChecklist
};
