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

const { normalizeState: mapState } = require('./state-map');

const TASK_TYPES = Object.freeze([
  'ONBOARDING',
  'OFFBOARDING',
  'FOOT MOVE',
  'HARDWARE',
  'HARDWARE SWAP',
  'SOFTWARE',
  'REQUEST FULFILLMENT',
  'INCIDENT',
  'LOST_STOLEN',
  'DISPOSITION',
  'OTHER'
]);

const STATES = Object.freeze([
  'NEW',
  'OPEN',
  'IN PROGRESS',
  'PENDING',
  'ON HOLD',
  'RESOLVED',
  'CLOSED',
  'CANCELED'
]);

function normalizeState(state, options) {
  // Delegates to the shared ServiceNow state map so raw codes ("2") and
  // display labels ("Work in Progress") reach the same canonical vocabulary
  // as hand-typed UI values. Unrecognized input passes through as cleaned
  // text and is handled as "Unknown state requires review" below.
  return mapState(state, options);
}

// Task types fulfilled through the ServiceNow service catalog (RITM / SC Task).
// These have no physical asset to verify, so closure requires
// `fulfillmentVerified` (set only by the request-fulfillment evaluator,
// server/l1-copilot/request-fulfillment.js) instead of `assetVerified`.
const FULFILLMENT_TASK_TYPES = Object.freeze([
  'SOFTWARE',
  'REQUEST FULFILLMENT'
]);

// ServiceNow catalog numbers imply their table; incident numbers do not need
// one (state-map defaults to incident). Lets a RITM/SCTASK read its own state
// codes correctly ("3" = Closed Complete, not On Hold) without the client
// having to know about state tables.
function inferStateTable(number) {
  const value = String(number || '').trim().toUpperCase();
  if (/^RITM\d+$/.test(value)) return 'sc_req_item';
  if (/^SCTASK\d+$/.test(value)) return 'sc_task';
  return undefined;
}

function resolveStateTable(input = {}) {
  return input.stateTable || inferStateTable(input.incident || input.number);
}

function normalizeTaskType(taskType) {
  const value = String(taskType || 'OTHER')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');

  if (value === 'FOOTMOVE') return 'FOOT MOVE';
  if (value === 'HARDWARESWAP') return 'HARDWARE SWAP';
  if (value === 'REQUESTFULFILLMENT') return 'REQUEST FULFILLMENT';

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

  if (/lost|stolen|missing|device missing|asset missing/.test(text)) {
    return {
      taskType: 'LOST_STOLEN',
      source: 'description'
    };
  }

  // A failed install/deploy is an incident even when the text also names the
  // machine ("Office install error on desktop"), so this runs before the
  // hardware-noun and software checks below.
  if (
    /(install|deploy|upgrade|update)\w*\s+(failed|failure|error)|(failed|failure|error)\b[^.]*\b(install|deploy)/.test(text)
  ) {
    return {
      taskType: 'INCIDENT',
      source: 'description'
    };
  }

  if (/incident|outage|not working|failure|error|broken/.test(text)) {
    return {
      taskType: 'INCIDENT',
      source: 'description'
    };
  }

  if (/hardware swap|device swap|replacement device/.test(text)) {
    return {
      taskType: 'HARDWARE SWAP',
      source: 'description'
    };
  }

  // "Install a laptop/dock/monitor" is hardware work; "install X on the
  // laptop" is software. Only the install's object decides.
  const hardwareInstall =
    /\binstall\w*\s+(?:of\s+)?(?:(?:an?|the|new)\s+)*(?:laptop|desktop|monitor|dock\w*|keyboard|mouse|headset)\b/.test(text);

  if (
    /software|licen[sc]e|subscription|\bapps?\b|application|\bclient\b|\bsaas\b/.test(text) ||
    (/\b(?:re)?install(?:ation|ed|ing)?\b/.test(text) && !hardwareInstall)
  ) {
    return {
      taskType: 'SOFTWARE',
      source: 'description'
    };
  }

  if (
    /request fulfil|service request|catalog item|\britm\b|\bsctask\b|grant access|access request|add (?:the )?user to|distribution list|shared (?:drive|mailbox)|permissions?\b/.test(text)
  ) {
    return {
      taskType: 'REQUEST FULFILLMENT',
      source: 'description'
    };
  }

  if (/hardware|laptop|desktop|monitor|dock|keyboard|mouse/.test(text)) {
    return {
      taskType: 'HARDWARE',
      source: 'description'
    };
  }

  return {
    taskType: 'OTHER',
    source: 'default'
  };
}

const EVIDENCE_META = Object.freeze({
  userVerified: { label: 'User validation' },
  assetVerified: { label: 'Asset validation' },
  workConfirmed: { label: 'Required work' },
  tested: { label: 'Functionality testing' },
  locationVerified: { label: 'Location verification', nextAction: 'VERIFY LOCATION' },
  finalWorkNoteConfirmed: { label: 'Final work note confirmation' },
  warrantyVerified: { label: 'Warranty verification' },
  conditionDocumented: { label: 'Condition documentation' },
  repairHistoryReviewed: { label: 'Repair history review' },
  replacementAddressed: { label: 'Replacement addressed' },
  dataSecurityReviewed: { label: 'Data security review' },
  approvalObtained: { label: 'Disposition approval' },
  sanitizationVerified: { label: 'Data sanitization verification' },
  dispositionCompleted: { label: 'Physical disposition completed' },
  assetReconciled: { label: 'CMDB asset reconciliation' },
  securityEscalation: { label: 'Security escalation' },
  securityActionVerified: { label: 'Security action verification' }
});

const DEFAULT_EVIDENCE_KEYS = Object.freeze([
  'userVerified',
  'assetVerified',
  'workConfirmed',
  'tested',
  'finalWorkNoteConfirmed'
]);

function getRequiredEvidence(taskType) {
  const normalizedTask = normalizeTaskType(taskType);

  const required = [
    {
      key: 'userVerified',
      label: 'User validation'
    },
    FULFILLMENT_TASK_TYPES.includes(normalizedTask)
      ? {
          key: 'fulfillmentVerified',
          label: 'Request fulfillment validation'
        }
      : {
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
  const state = normalizeState(input.state, { table: resolveStateTable(input) });
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

  if (state === 'RESOLVED' || state === 'CLOSED' || state === 'CANCELED') {
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
  FULFILLMENT_TASK_TYPES,
  STATES,
  inferStateTable,
  resolveStateTable,
  normalizeState,
  normalizeTaskType,
  classifyTask,
  getRequiredEvidence,
  evaluateWorkflow
};
