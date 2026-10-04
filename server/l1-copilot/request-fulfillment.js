'use strict';

/**
 * TSM L1 COPILOT -- REQUEST FULFILLMENT EVIDENCE EVALUATOR
 *
 * Scope: SOFTWARE and REQUEST FULFILLMENT tickets worked through the
 * ServiceNow service catalog (sc_req_item "RITM" / sc_task "SCTASK").
 * Software installs, license assignments, access and group requests.
 *
 * Prior to this module these tickets fell into OTHER/HARDWARE and were
 * closed on the generic hand-ticked `assetVerified` checkbox -- meaningless
 * for a license or access grant, and never checked against the RITM/SC Task
 * itself. For these task types the closure gate now requires
 * `fulfillmentVerified` (see workflow-engine.js), which this module is the
 * only thing meant to set. It requires:
 *   - a request number that is a RITM or SCTASK number
 *   - the catalog record actually looked up for that number (the lookup is
 *     done elsewhere, via GET /api/l1-copilot/servicenow/request/:number;
 *     this module does not perform it, it only evaluates the result)
 *   - the looked-up record's own number matching what was entered
 *   - for a RITM: its SC Tasks looked up, and none still open
 *   - an explicit fulfillment outcome (not just "done")
 *   - a written reason when the outcome is a cancellation or exception
 *   - for SOFTWARE fulfilled outright: explicit confirmation the software
 *     is installed / the license is assigned and visible to the requester
 *   - technician confirmation (never inferred)
 *
 * Governance (same shape as asset-recovery.js / closure-gate.js):
 *   READ (catalog lookup, elsewhere) -> EVALUATE (here) -> technician confirms
 *
 * This module does NOT:
 *   - call ServiceNow or any network service
 *   - change RITMs, SC Tasks or any other record
 *   - close or resolve anything
 */

const { normalizeState } = require('./state-map');
const {
  normalizeTaskType,
  FULFILLMENT_TASK_TYPES
} = require('./workflow-engine');

const FULFILLMENT_OUTCOMES = Object.freeze([
  'FULFILLED',
  'ALREADY_PROVISIONED',
  'CANCELED_BY_REQUESTER',
  'EXCEPTION_NOT_FULFILLED'
]);

// Outcomes where the work was not delivered: must say why.
const REASON_REQUIRED_OUTCOMES = Object.freeze([
  'CANCELED_BY_REQUESTER',
  'EXCEPTION_NOT_FULFILLED'
]);

// Outcomes where the requester ends up with what they asked for.
const DELIVERED_OUTCOMES = Object.freeze([
  'FULFILLED',
  'ALREADY_PROVISIONED'
]);

const REQUEST_NUMBER_PATTERN = /^(RITM|SCTASK)\d+$/;

function isRequestFulfillmentTask(taskType) {
  return FULFILLMENT_TASK_TYPES.includes(normalizeTaskType(taskType));
}

function cleanNumber(value) {
  return String(value == null ? '' : value).trim().toUpperCase();
}

function isOpenCatalogTask(task) {
  // Fail safe: any state we cannot positively identify as finished counts
  // as still open.
  const state = normalizeState(task && task.state, { table: 'sc_task' });
  return state !== 'CLOSED' && state !== 'CANCELED';
}

/**
 * evaluateRequestFulfillment(input) -> {
 *   applies: boolean,             // false => task type uses another model
 *   fulfillmentVerified: boolean|null,  // null only when applies === false
 *   missing: string[],            // machine-readable gap keys
 *   openTasks: string[],          // SC Task numbers still open (RITM only)
 *   reason: string,
 *   requestNumber: string|null,
 *   fulfillmentOutcome: string|null
 * }
 *
 * input:
 *   taskType             required
 *   requestNumber        the RITM/SCTASK number the technician entered
 *   catalogRecord        the record returned by the catalog lookup, or
 *                         null/undefined if no lookup has happened yet
 *   catalogTasks         for a RITM: the SC Tasks returned by the lookup
 *   fulfillmentOutcome   one of FULFILLMENT_OUTCOMES
 *   outcomeReason        required for cancellation / exception outcomes
 *   softwareConfirmed    SOFTWARE only: installed / license visible, === true
 *   technicianConfirmed  must be === true
 */
function evaluateRequestFulfillment(input = {}) {
  const taskType = normalizeTaskType(input.taskType);

  if (!isRequestFulfillmentTask(taskType)) {
    return {
      applies: false,
      fulfillmentVerified: null,
      missing: [],
      openTasks: [],
      reason: 'This task type does not use request fulfillment evidence.',
      requestNumber: null,
      fulfillmentOutcome: null
    };
  }

  const requestNumber = cleanNumber(input.requestNumber);
  const catalogRecord = input.catalogRecord || null;
  const fulfillmentOutcome = input.fulfillmentOutcome || null;
  const isRitm = requestNumber.startsWith('RITM');
  const missing = [];

  if (!requestNumber || !REQUEST_NUMBER_PATTERN.test(requestNumber)) {
    missing.push('requestNumber');
  }
  if (!catalogRecord) missing.push('catalogRecord');

  if (
    !fulfillmentOutcome ||
    !FULFILLMENT_OUTCOMES.includes(fulfillmentOutcome)
  ) {
    missing.push('fulfillmentOutcome');
  }

  if (
    REASON_REQUIRED_OUTCOMES.includes(fulfillmentOutcome) &&
    !(input.outcomeReason && String(input.outcomeReason).trim())
  ) {
    missing.push('outcomeReason');
  }

  if (
    taskType === 'SOFTWARE' &&
    DELIVERED_OUTCOMES.includes(fulfillmentOutcome) &&
    input.softwareConfirmed !== true
  ) {
    missing.push('softwareConfirmed');
  }

  if (input.technicianConfirmed !== true) missing.push('technicianConfirmed');

  // A looked-up record whose own number doesn't match what the technician
  // entered means the wrong request was checked -- never silently accept it.
  // Only runs once requestNumber is known valid, so a missing number is
  // reported as that, not misreported as a mismatch.
  if (
    requestNumber &&
    REQUEST_NUMBER_PATTERN.test(requestNumber) &&
    catalogRecord &&
    catalogRecord.number &&
    cleanNumber(catalogRecord.number) !== requestNumber
  ) {
    return {
      applies: true,
      fulfillmentVerified: false,
      missing: ['requestNumberMismatch'],
      openTasks: [],
      reason: `Catalog record ${cleanNumber(catalogRecord.number)} does not match the entered request number ${requestNumber}.`,
      requestNumber,
      fulfillmentOutcome
    };
  }

  // A RITM is the parent of its SC Tasks: it cannot be verified fulfilled
  // while any task is unfinished, and "no tasks returned" is only believable
  // if the task lookup actually ran.
  let openTasks = [];
  if (isRitm && catalogRecord) {
    if (!Array.isArray(input.catalogTasks)) {
      missing.push('catalogTasks');
    } else {
      openTasks = input.catalogTasks
        .filter(isOpenCatalogTask)
        .map(task => cleanNumber(task && task.number) || 'UNKNOWN');
      if (openTasks.length) missing.push('openCatalogTasks');
    }
  }

  if (missing.length) {
    return {
      applies: true,
      fulfillmentVerified: false,
      missing,
      openTasks,
      reason: openTasks.length
        ? `Request fulfillment evidence is incomplete; SC Tasks still open: ${openTasks.join(', ')}.`
        : 'Request fulfillment evidence is incomplete.',
      requestNumber: requestNumber || null,
      fulfillmentOutcome
    };
  }

  return {
    applies: true,
    fulfillmentVerified: true,
    missing: [],
    openTasks: [],
    reason: 'Request fulfillment confirmed by technician against a matching catalog record.',
    requestNumber,
    fulfillmentOutcome
  };
}

module.exports = {
  FULFILLMENT_OUTCOMES,
  isRequestFulfillmentTask,
  evaluateRequestFulfillment
};
