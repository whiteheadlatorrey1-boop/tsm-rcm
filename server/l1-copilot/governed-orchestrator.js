'use strict';

/**
 * Governed L1 Copilot orchestration layer.
 *
 * READ ONLY.
 *
 * ServiceNow reconciliation facts are context only.
 * They are never converted automatically into technician evidence.
 *
 * This module:
 *   1. accepts ticket/context information
 *   2. accepts technician-confirmed evidence
 *   3. evaluates workflow state
 *   4. evaluates closure readiness
 *
 * It does NOT:
 *   - call ServiceNow
 *   - change ServiceNow state
 *   - close tickets
 *   - write work notes
 *   - manufacture technician evidence
 */

const {
  evaluateWorkflow
} = require('./workflow-engine');

const {
  evaluateClosure,
  buildClosureChecklist
} = require('./closure-gate');

const { evaluateGates } = require('./gate-tracker');

function normalizeObject(value) {
  return value && typeof value === 'object'
    ? value
    : {};
}

function buildTechnicianEvidence(input = {}) {
  /*
   * Only explicit technician-confirmed values become evidence.
   *
   * ServiceNow-fetched facts are intentionally excluded.
   */
  const evidence = normalizeObject(input.evidence);

  return {
    userVerified: evidence.userVerified === true,
    assetVerified: evidence.assetVerified === true,
    workConfirmed: evidence.workConfirmed === true,
    tested: evidence.tested === true,
    locationVerified: evidence.locationVerified === true,
    finalWorkNoteConfirmed: evidence.finalWorkNoteConfirmed === true
  };
}

function orchestrate(input = {}) {
  const context = normalizeObject(input.context);
  const evidence = buildTechnicianEvidence(input);

  const workflowInput = {
    state: input.state,
    taskType: input.taskType,

    shortDescription:
      input.shortDescription ||
      context.shortDescription ||
      '',

    description:
      input.description ||
      context.description ||
      '',

    category:
      input.category ||
      context.category ||
      '',

    subcategory:
      input.subcategory ||
      context.subcategory ||
      '',

    dependencies: Array.isArray(input.dependencies)
      ? input.dependencies
      : [],

    evidence
  };

  const workflow = evaluateWorkflow(workflowInput);

  const closure = evaluateClosure({
    state: input.state,
    taskType: workflow.taskType,
    evidence
  });

  const checklist = buildClosureChecklist({
    taskType: workflow.taskType,
    evidence
  });

  /*
   * Gate tracker: reports which gate blocks closure and execution.
   * input.action, when supplied, is an action-gate record. Confirmation is
   * read from that record only; it is never derived from evidence or from
   * ServiceNow reconciliation context.
   */
  const gates = evaluateGates({
    state: input.state,
    taskType: workflow.taskType,
    evidence,
    action: input.action
  });

  /*
   * Preserve ServiceNow reconciliation as explicit context.
   *
   * IMPORTANT:
   * - This is informational context only.
   * - It is never converted into technician evidence.
   * - It cannot authorize closure.
   * - It cannot change ServiceNow state.
   */
  const serviceNowReconciliation =
    context.reconciliation &&
    typeof context.reconciliation === 'object'
      ? context.reconciliation
      : null;

  return {
    workflow,
    closure,
    checklist,
    gates,

    context: {
      serviceNowReconciliation,
      source: serviceNowReconciliation
        ? 'servicenow-reconciliation'
        : null
    },

    evidence: {
      source: 'technician-confirmed-input',
      values: evidence,
      derivedFromServiceNow: false
    },

    governed: {
      readOnly: true,
      canChangeState: false,
      autonomousCloseAllowed: false,
      autonomousWorkNoteWriteAllowed: false,
      technicianEvidenceUntouched: true
    }
  };
}

module.exports = {
  orchestrate,
  buildTechnicianEvidence
};
