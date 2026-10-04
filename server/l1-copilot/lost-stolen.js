'use strict';

/**
 * TSM L1 — LOST / STOLEN ASSET ASSESSMENT
 *
 * Pure decision/evidence logic.
 *
 * L1 recommends.
 * Humans authorize/act.
 * L1 verifies.
 *
 * This module:
 *   - reads supplied user/asset/security facts
 *   - determines whether security escalation is required
 *   - never locks, wipes, disables, retires, or modifies an asset
 *   - never writes to ServiceNow
 *   - never closes a ticket
 */

const SECURITY_STATES = Object.freeze([
  'COMPLIANT',
  'NONCOMPLIANT',
  'UNKNOWN'
]);

function normalizeSecurityState(value) {
  const state = String(value || '').trim().toUpperCase();

  if (state === 'COMPLIANT') return 'COMPLIANT';
  if (state === 'NONCOMPLIANT' || state === 'NON-COMPLIANT') {
    return 'NONCOMPLIANT';
  }

  return 'UNKNOWN';
}

function assessLostStolen(input = {}) {
  const missingInputs = [];

  if (!input.userVerified) missingInputs.push('userVerified');
  if (!input.assetVerified) missingInputs.push('assetVerified');

  const securityState = normalizeSecurityState(input.complianceStatus);

  if (!input.securityStatusKnown &&
      !Object.prototype.hasOwnProperty.call(input, 'complianceStatus')) {
    missingInputs.push('securityStatus');
  }

  const base = {
    autonomousActionAllowed: false,
    humanApprovalRequired: true,
    requiresSecurityGate: true,
    requiredGates: [
      'READ',
      'RECONCILE',
      'ASSESS',
      'SECURITY',
      'HUMAN_CONFIRMATION',
      'EXECUTION',
      'VERIFICATION',
      'CLOSURE'
    ],
    missingInputs,
    securityState,
    recommendation: 'SECURITY_ESCALATION',
    suggestedAction: 'ESCALATION',
    reasons: []
  };

  if (missingInputs.length) {
    return Object.assign(base, {
      recommendation: 'INSUFFICIENT_DATA',
      suggestedAction: null,
      reasons: [
        'Required facts were not supplied; L1 will not guess.'
      ]
    });
  }

  const reasons = [
    'Lost/stolen asset requires security review and escalation.'
  ];

  if (securityState === 'NONCOMPLIANT') {
    reasons.push(
      'Device security status is noncompliant; security response must be verified.'
    );
  } else if (securityState === 'COMPLIANT') {
    reasons.push(
      'Device reports compliant security status; security escalation remains required for the lost/stolen event.'
    );
  } else {
    reasons.push(
      'Security status is unknown; treated as a security concern (fail-safe).'
    );
  }

  return Object.assign(base, { reasons });
}

function evaluateLostStolenReadiness(evidence = {}) {
  const required = [
    'userVerified',
    'assetVerified',
    'securityEscalation',
    'securityActionVerified',
    'assetReconciled',
    'finalWorkNoteConfirmed'
  ];

  const missing = required.filter(key => evidence[key] !== true);

  return {
    ready: missing.length === 0,
    status: missing.length === 0 ? 'READY' : 'BLOCKED',
    missing,
    autonomousCloseAllowed: false
  };
}

module.exports = {
  SECURITY_STATES,
  normalizeSecurityState,
  assessLostStolen,
  evaluateLostStolenReadiness
};
