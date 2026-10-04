'use strict';

/**
 * TSM L1 COPILOT -- ASSET RECOVERY EVIDENCE EVALUATOR
 *
 * Scope: this is NOT the same "recovery" as server/healthcare's revenue
 * recovery (denials/claims/payer appeals). This module governs whether an
 * IT hardware asset (laptop, monitor, etc.) was actually accounted for
 * during an OFFBOARDING or HARDWARE SWAP ticket, before the generic
 * `evidence.assetVerified` flag the closure gate reads can be set true.
 *
 * Prior to this module, `assetVerified` was a single hand-ticked checkbox
 * identical across every task type -- a technician could confirm "Asset
 * validation" for an offboarding ticket without ever looking up the
 * asset's CMDB record or stating what happened to it. For asset-recovery
 * task types, this module requires:
 *   - an asset tag
 *   - an actual CMDB record for that tag (looked up via the existing
 *     GET /api/l1-copilot/servicenow/asset/:tag route -- this module does
 *     not perform the lookup itself, it only evaluates the result)
 *   - the CMDB record's own tag matching what the technician entered
 *   - an explicit recovery outcome (not just "done")
 *   - a written reason when the outcome is an exception
 *   - technician confirmation (never inferred)
 *
 * Governance (same shape as workflow-engine.js / closure-gate.js):
 *   READ (CMDB lookup, elsewhere) -> EVALUATE (here) -> technician confirms
 *
 * This module does NOT:
 *   - call ServiceNow or any network service
 *   - change ServiceNow state or CMDB records
 *   - decide recovery evidence is complete without a technician's
 *     explicit, named outcome
 *
 * Task types outside this module's scope (ONBOARDING, INCIDENT, FOOT MOVE,
 * etc.) are untouched: they keep using the plain `assetVerified` boolean
 * closure-gate.js already supports. isAssetRecoveryTask() is the single
 * source of truth for which task types this stricter model applies to.
 */

const { normalizeTaskType } = require('./workflow-engine');

const ASSET_RECOVERY_TASK_TYPES = Object.freeze([
  'OFFBOARDING',
  'HARDWARE SWAP'
]);

const RECOVERY_OUTCOMES = Object.freeze([
  'RETURNED_TO_STOCK',
  'REASSIGNED',
  'WIPED_AND_RETURNED',
  'EXCEPTION_NOT_RECOVERED'
]);

function isAssetRecoveryTask(taskType) {
  return ASSET_RECOVERY_TASK_TYPES.includes(normalizeTaskType(taskType));
}

function cleanTag(tag) {
  return String(tag == null ? '' : tag).trim().toUpperCase();
}

/**
 * evaluateAssetRecovery(input) -> {
 *   applies: boolean,            // false => this task type uses the plain
 *                                //          assetVerified checkbox instead
 *   assetVerified: boolean|null, // null only when applies === false
 *   missing: string[],           // machine-readable gap keys
 *   reason: string,
 *   assetTag: string|null,
 *   recoveryOutcome: string|null
 * }
 *
 * input:
 *   taskType             required
 *   assetTag             the tag the technician entered/scanned
 *   cmdbAsset            the record returned by getAsset(assetTag), or
 *                         null/undefined if no lookup has happened yet
 *   recoveryOutcome      one of RECOVERY_OUTCOMES
 *   exceptionReason      required when recoveryOutcome is the exception
 *   technicianConfirmed  must be === true
 */
function evaluateAssetRecovery(input = {}) {
  const taskType = normalizeTaskType(input.taskType);

  if (!isAssetRecoveryTask(taskType)) {
    return {
      applies: false,
      assetVerified: null,
      missing: [],
      reason: 'This task type uses standard asset validation, not asset recovery evidence.',
      assetTag: null,
      recoveryOutcome: null
    };
  }

  const assetTag = cleanTag(input.assetTag);
  const cmdbAsset = input.cmdbAsset || null;
  const recoveryOutcome = input.recoveryOutcome || null;
  const missing = [];

  if (!assetTag) missing.push('assetTag');
  if (!cmdbAsset) missing.push('cmdbAsset');
  if (!recoveryOutcome || !RECOVERY_OUTCOMES.includes(recoveryOutcome)) {
    missing.push('recoveryOutcome');
  }
  if (
    recoveryOutcome === 'EXCEPTION_NOT_RECOVERED' &&
    !(input.exceptionReason && String(input.exceptionReason).trim())
  ) {
    missing.push('exceptionReason');
  }
  if (input.technicianConfirmed !== true) missing.push('technicianConfirmed');

  // A looked-up CMDB record whose own tag doesn't match what the
  // technician entered means the wrong asset was checked -- never silently
  // accept it even if every other field is present. Only runs once assetTag
  // itself is known non-empty, so a missing assetTag is reported as that,
  // not misreported as a mismatch against whatever CMDB record was passed.
  if (
    assetTag &&
    cmdbAsset &&
    cmdbAsset.assetTag &&
    cleanTag(cmdbAsset.assetTag) !== assetTag
  ) {
    return {
      applies: true,
      assetVerified: false,
      missing: ['assetTagMismatch'],
      reason: `CMDB record ${cleanTag(cmdbAsset.assetTag)} does not match the entered asset tag ${assetTag}.`,
      assetTag,
      recoveryOutcome
    };
  }

  if (missing.length) {
    return {
      applies: true,
      assetVerified: false,
      missing,
      reason: 'Asset recovery evidence is incomplete.',
      assetTag: assetTag || null,
      recoveryOutcome
    };
  }

  return {
    applies: true,
    assetVerified: true,
    missing: [],
    reason: 'Asset recovery evidence confirmed by technician against a matching CMDB record.',
    assetTag,
    recoveryOutcome
  };
}

module.exports = {
  ASSET_RECOVERY_TASK_TYPES,
  RECOVERY_OUTCOMES,
  isAssetRecoveryTask,
  evaluateAssetRecovery
};
