'use strict';

/*
 * TSM Phase 11G — HR Compliance Evidence.
 *
 * Tracks evidence references, not legal conclusions.
 * Does not claim regulatory compliance automatically.
 */

var VERSION = '11G.0';

var EVIDENCE_TYPES = [
  'policy_acknowledgment',
  'training_completion',
  'required_document',
  'manager_confirmation',
  'system_confirmation',
  'asset_confirmation',
  'other'
];

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function createEvidence(input) {
  input = input || {};

  return {
    evidenceId: clean(input.evidenceId),
    workerId: clean(input.workerId),
    requirementId: clean(input.requirementId),
    type: clean(input.type || 'other'),
    status: clean(input.status || 'pending'),
    evidenceRef: clean(input.evidenceRef) || null,
    verified: input.verified === true,
    source: clean(input.source || 'hr_operations'),
    recordedAt: input.recordedAt || null
  };
}

function validateEvidence(evidence) {
  var failures = [];
  evidence = evidence || {};

  if (!evidence.evidenceId) failures.push('evidence_id_required');
  if (!evidence.workerId) failures.push('worker_id_required');
  if (!evidence.requirementId) failures.push('requirement_id_required');

  if (EVIDENCE_TYPES.indexOf(evidence.type) < 0) {
    failures.push('invalid_evidence_type');
  }

  return {
    valid: failures.length === 0,
    failures: failures
  };
}

function summarize(records) {
  var list = Array.isArray(records) ? records : [];

  return {
    total: list.length,
    verified: list.filter(function (item) {
      return item.verified === true;
    }).length,
    pending: list.filter(function (item) {
      return item.status === 'pending';
    }).length
  };
}

module.exports = {
  VERSION: VERSION,
  EVIDENCE_TYPES: EVIDENCE_TYPES.slice(),
  createEvidence: createEvidence,
  validateEvidence: validateEvidence,
  summarize: summarize
};
