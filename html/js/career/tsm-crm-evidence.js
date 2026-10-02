'use strict';

/*
 * TSM Phase 12G — CRM Evidence / Audit.
 *
 * Evidence references only.
 * Does not modify staffing evidence.
 */

var VERSION = '12G.0';

var TYPES = [
  'client_request',
  'meeting_note',
  'proposal',
  'job_order',
  'approval',
  'status_change',
  'placement_feedback',
  'other'
];

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function createEvidence(input) {
  input = input || {};

  return {
    evidenceId: clean(input.evidenceId || input.id),
    accountId: clean(input.accountId),
    contactId: clean(input.contactId) || null,
    opportunityId: clean(input.opportunityId) || null,
    jobOrderId: clean(input.jobOrderId) || null,
    type: clean(input.type || 'other'),
    evidenceRef: clean(input.evidenceRef) || null,
    verified: input.verified === true,
    actorId: clean(input.actorId) || null,
    recordedAt: input.recordedAt || null,
    source: 'crm_employer_operations'
  };
}

function validateEvidence(evidence) {
  var failures = [];
  evidence = evidence || {};

  if (!evidence.evidenceId) failures.push('evidence_id_required');
  if (!evidence.accountId) failures.push('account_id_required');

  if (TYPES.indexOf(evidence.type) < 0) {
    failures.push('invalid_evidence_type');
  }

  return {
    valid: failures.length === 0,
    failures: failures
  };
}

function dedupe(records) {
  var seen = {};
  var output = [];

  (Array.isArray(records) ? records : []).forEach(function (record) {
    var id = clean(record && record.evidenceId);

    if (!id || seen[id]) return;

    seen[id] = true;
    output.push(record);
  });

  return output;
}

module.exports = {
  VERSION: VERSION,
  TYPES: TYPES.slice(),
  createEvidence: createEvidence,
  validateEvidence: validateEvidence,
  dedupe: dedupe
};
