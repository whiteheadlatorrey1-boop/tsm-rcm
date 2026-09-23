'use strict';

/**
 * TSM L1 COPILOT — STATE-AWARE WORKFLOW ENGINE
 *
 * Responsibilities:
 *   - Normalize ServiceNow state/task type
 *   - Determine the technician's next action
 *   - Keep workflow guidance separate from ServiceNow writes
 *   - Never mutate ServiceNow state
 *
 * Governance:
 *   READ → RECONCILE → GUIDE
 *
 * This module does NOT:
 *   - change ServiceNow state
 *   - close tickets
 *   - write work notes
 *   - modify CMDB records
 */

const TASK_TYPES = Object.freeze([
  'ONBOARDING',
  'OFFBOARDING',
  'FOOT MOVE',
  'HARDWARE',
  'HARDWARE SWAP',
  'INCIDENT',
  'OTHER'
]);

const STATES = Object.freeze([
  'NEW',
  'OPEN',
  'IN PROGRESS',
  'PENDING',
  'ON HOLD',
  'RESOLVED',
  'CLOSED'
]);

function normalizeState(state) {
  const value = String(state || '').trim().toUpperCase();

  if (value === 'IN_PROGRESS' || value === 'IN-PROGRESS') {
    return 'IN PROGRESS';
  }

  if (value === 'ON_HOLD' || value === 'ON-HOLD') {
    return 'ON HOLD';
  }

  return value;
}

function normalizeTaskType(taskType) {
  const value = String(taskType || 'OTHER')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');

  if (value === 'FOOTMOVE') return 'FOOT MOVE';
  if (value === 'HARDWARESWAP') return 'HARDWARE SWAP';

  return TASK_TYPES.includes(value) ? value : 'OTHER';
}

function classifyTask(input = {}) {
  const explicit = normalizeTaskType(input.taskType);

  if (explicit !== 'OTHER') {
    return {
      taskType: explicit,
      source: 'explicit'
    };
  }

  const text = [
    input.shortDescription,
    input.description,
    input.category,
    input.subcategory
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/new hire|new-hire|onboard|onboarding/.test(text)) {
    return {
      taskType: 'ONBOARDING',
      source: 'description'
    };
  }

  if (/offboard|termination|departing employee|employee departure/.test(text)) {
    return {
      taskType: 'OFFBOARDING',
      source: 'description'
    };
  }

  if (/foot move|move user|relocat|desk move|seat move/.test(text)) {
    return {
      taskType: 'FOOT MOVE',
      source: 'description'
    };
  }

  if (/hardware swap|device swap|replacement device/.test(text)) {
    return {
      taskType: 'HARDWARE SWAP',
      source: 'description'
    };
  }

  if (/hardware|laptop|desktop|monitor|dock|keyboard|mouse/.test(text)) {
    return {
      taskType: 'HARDWARE',
      source: 'description'
    };
  }

  if (/incident|outage|not working|failure|error|broken/.test(text)) {
    return {
      taskType: 'INCIDENT',
      source: 'description'
    };
  }

  return {
    taskType: 'OTHER',
    source: 'default'
  };
}

function getRequiredEvidence(taskType) {
  const normalizedTask = normalizeTaskType(taskType);

  const required = [
    {
      key: 'userVerified',
      label: 'User validation'
    },
    {
      key: 'assetVerified',
      label: 'Asset validation'
    },
    {
      key: 'workConfirmed',
      label: 'Required work'
    },
    {
      key: 'tested',
      label: 'Functionality testing'
    }
  ];

  if (
    ['FOOT MOVE', 'ONBOARDING', 'OFFBOARDING'].includes(normalizedTask)
  ) {
    required.push({
      key: 'locationVerified',
      label: 'Location verification',
      nextAction: 'VERIFY LOCATION'
    });
  }

  required.push({
    key: 'finalWorkNoteConfirmed',
    label: 'Final work note confirmation'
  });

  return required;
}

function evaluateWorkflow(input = {}) {
  const state = normalizeState(input.state);
  const classification = classifyTask(input);
  const taskType = classification.taskType;
  const evidence = input.evidence || {};
  const dependencies = Array.isArray(input.dependencies)
    ? input.dependencies
    : [];

  if (state === 'NEW' || state === 'OPEN') {
    return {
      state,
      taskType,
      classificationSource: classification.source,
      nextAction: 'REVIEW',
      readyForClosure: false,
      canChangeState: false,
      reason: 'Ticket must be reviewed before active work begins.'
    };
  }

  if (state === 'PENDING' || state === 'ON HOLD') {
    return {
      state,
      taskType,
      classificationSource: classification.source,
      nextAction: 'RESOLVE DEPENDENCY',
      readyForClosure: false,
      canChangeState: false,
      reason: dependencies.length
        ? 'Ticket is blocked by an outstanding dependency.'
        : 'Pending/On Hold requires a documented dependency.',
      dependencies
    };
  }

  if (state === 'RESOLVED' || state === 'CLOSED') {
    return {
      state,
      taskType,
      classificationSource: classification.source,
      nextAction: 'REVIEW',
      readyForClosure: false,
      canChangeState: false,
      reason: 'Ticket is already resolved or closed.'
    };
  }

  if (state !== 'IN PROGRESS') {
    return {
      state,
      taskType,
      classificationSource: classification.source,
      nextAction: 'REVIEW',
      readyForClosure: false,
      canChangeState: false,
      reason: 'Unknown state requires review.'
    };
  }

  const requiredEvidence = getRequiredEvidence(taskType);

  for (const requirement of requiredEvidence) {
    if (evidence[requirement.key] !== true) {
      return {
        state,
        taskType,
        classificationSource: classification.source,
        nextAction: requirement.nextAction || requirement.label.toUpperCase(),
        readyForClosure: false,
        canChangeState: false,
        reason: `${requirement.label} has not been confirmed.`,
        missingEvidence: [requirement.key]
      };
    }
  }

  return {
    state,
    taskType,
    classificationSource: classification.source,
    nextAction: 'TECHNICIAN MAY CLOSE',
    readyForClosure: true,
    canChangeState: false,
    reason: 'Required closure evidence has been confirmed.',
    missingEvidence: []
  };
}

module.exports = {
  TASK_TYPES,
  STATES,
  normalizeState,
  normalizeTaskType,
  classifyTask,
  getRequiredEvidence,
  evaluateWorkflow
};
