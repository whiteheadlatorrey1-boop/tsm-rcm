'use strict';

/**
 * TSM L1 — ASSET LIFECYCLE + DISPOSITION ASSESSMENT (Phase 2/3, pure)
 *
 *   L1 recommends. Humans authorize. L1 verifies.
 *
 * Reads only technician/CMDB-supplied facts. Never invents a value: unknown
 * stays unknown and is reported in missingInputs. This module performs no
 * ServiceNow/network calls, writes nothing, retires nothing, closes nothing.
 * Every result carries autonomousActionAllowed:false.
 */

const { getRequiredEvidence, getGates } = require('./workflow-contract');

const ASSET_STATES = Object.freeze([
  'ASSIGNED', 'LOANER', 'INVENTORY', 'IN_REPAIR',
  'RECOVERY', 'DISPOSITION_PENDING', 'RETIRED'
]);

// Allowed lifecycle moves (see Phase 2 diagram). Anything else is rejected.
const TRANSITIONS = Object.freeze({
  ASSIGNED: ['ASSIGNED', 'LOANER', 'RECOVERY'],           // swap keeps ASSIGNED; reassign is ASSIGNED->ASSIGNED
  LOANER: ['INVENTORY', 'RECOVERY'],                      // loaner return
  INVENTORY: ['ASSIGNED', 'LOANER', 'RECOVERY'],          // reassign / issue loaner
  RECOVERY: ['IN_REPAIR', 'INVENTORY', 'DISPOSITION_PENDING'],
  IN_REPAIR: ['INVENTORY', 'DISPOSITION_PENDING'],
  DISPOSITION_PENDING: ['RETIRED', 'INVENTORY'],          // approval may reverse the candidate
  RETIRED: []
});

// POLICY PLACEHOLDER — confirm with asset governance before relying on it.
const DEFAULT_POLICY = Object.freeze({ dispositionRepairThreshold: 2 });

const WARRANTY = ['IN_WARRANTY', 'OUT_OF_WARRANTY'];
const CONDITION = ['GOOD', 'FAIR', 'POOR', 'NON_FUNCTIONAL'];

function isValidTransition(from, to) {
  return Boolean(TRANSITIONS[from]) && TRANSITIONS[from].includes(to);
}

function up(v) {
  return typeof v === 'string' ? v.trim().toUpperCase() : null;
}

function assessDisposition(input = {}, policy = {}) {
  const cfg = Object.assign({}, DEFAULT_POLICY, policy);
  const warranty = WARRANTY.includes(up(input.warrantyStatus)) ? up(input.warrantyStatus) : null;
  const condition = CONDITION.includes(up(input.condition)) ? up(input.condition) : null;
  const repairCount = Number.isInteger(input.repairCount) && input.repairCount >= 0 ? input.repairCount : null;
  const isLoaner = input.isLoaner === true;

  const missingInputs = [];
  if (!input.assetTag) missingInputs.push('assetTag');
  if (!warranty) missingInputs.push('warrantyStatus');
  if (!condition) missingInputs.push('condition');

  const base = {
    assetTag: input.assetTag || null,
    autonomousActionAllowed: false,
    humanApprovalRequired: true,
    missingInputs,
    reasons: [],
    suggestedTemplate: null,
    requiresSecurityGate: false,
    requiredGates: []
  };

  if (missingInputs.length) {
    return Object.assign(base, {
      recommendation: 'INSUFFICIENT_DATA',
      reasons: ['Required facts were not supplied; L1 will not guess.']
    });
  }

  const finish = (recommendation, suggestedTemplate, reason) => {
    const candidate = recommendation === 'DISPOSITION_CANDIDATE';
    const reasons = [reason];
    if (repairCount === null && condition === 'POOR' && warranty === 'OUT_OF_WARRANTY') {
      reasons.push('Repair history not supplied; treated as no prior repairs.');
    }
    if (candidate && input.dataBearing !== false) {
      reasons.push(input.dataBearing === true
        ? 'Device is data-bearing: sanitization must be verified before disposition.'
        : 'Data-bearing status unknown: treated as data-bearing (fail-safe).');
    }
    if (candidate && input.replacementAvailable !== true) {
      reasons.push('Replacement availability not confirmed; must be addressed before approval.');
    }
    return Object.assign(base, {
      recommendation,
      suggestedTemplate,
      reasons,
      requiresSecurityGate: candidate && input.dataBearing !== false,
      requiredGates: candidate ? getGates('DISPOSITION') : []
    });
  };

  if (input.reassignmentRequested === true && (condition === 'GOOD' || condition === 'FAIR')) {
    return finish('REASSIGN', 'DEVICE_REASSIGNMENT', 'Reassignment requested and device condition is acceptable.');
  }
  if (warranty === 'IN_WARRANTY' && (condition === 'POOR' || condition === 'NON_FUNCTIONAL')) {
    return finish('WARRANTY_RETURN', 'WARRANTY_DEPOT_RETURN', 'Device is in warranty and impaired; vendor coverage applies.');
  }
  if (warranty === 'OUT_OF_WARRANTY' && condition === 'NON_FUNCTIONAL') {
    return finish('DISPOSITION_CANDIDATE', 'DISPOSITION_RECOMMENDATION', 'Out of warranty and non-functional.');
  }
  if (warranty === 'OUT_OF_WARRANTY' && condition === 'POOR') {
    if ((repairCount || 0) >= cfg.dispositionRepairThreshold) {
      return finish('DISPOSITION_CANDIDATE', 'DISPOSITION_RECOMMENDATION',
        `Out of warranty, poor condition, and ${repairCount} prior repairs (threshold ${cfg.dispositionRepairThreshold}).`);
    }
    return finish('REPAIR', null, 'Out of warranty, poor condition, repair history below disposition threshold.');
  }
  if (condition === 'POOR') {
    return finish('REPAIR', null, 'Poor condition; repair before reuse.');
  }
  return isLoaner
    ? finish('RETURN_TO_POOL', 'LOANER_RETURN', 'Loaner in usable condition; return to loaner pool.')
    : finish('RETURN_TO_POOL', 'RETURN_TO_INVENTORY', 'Device in usable condition; return to inventory.');
}

/**
 * Disposition closure readiness from technician-confirmed evidence.
 * Also flags out-of-order steps (sanitization/disposition before approval).
 */
function evaluateDispositionReadiness(evidence = {}) {
  const required = getRequiredEvidence('DISPOSITION');
  const missing = required.filter(k => evidence[k] !== true);
  const orderViolations = [];
  if (evidence.sanitizationVerified === true && evidence.approvalObtained !== true) {
    orderViolations.push('sanitizationVerified before approvalObtained');
  }
  if (evidence.dispositionCompleted === true &&
      (evidence.approvalObtained !== true || evidence.sanitizationVerified !== true)) {
    orderViolations.push('dispositionCompleted before approval and sanitization');
  }
  const ready = missing.length === 0 && orderViolations.length === 0;
  return {
    ready,
    status: ready ? 'READY' : 'BLOCKED',
    missing,
    orderViolations,
    autonomousCloseAllowed: false
  };
}

module.exports = {
  ASSET_STATES,
  TRANSITIONS,
  DEFAULT_POLICY,
  isValidTransition,
  assessDisposition,
  evaluateDispositionReadiness
};
