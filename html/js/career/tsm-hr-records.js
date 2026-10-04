'use strict';

/*
 * TSM Phase 11E — HR Records.
 *
 * Metadata/evidence references only.
 * No document storage implementation.
 * No sensitive document contents.
 */

var VERSION = '11E.0';

var TYPES = [
  'employment',
  'policy',
  'training',
  'performance',
  'benefits',
  'payroll',
  'access',
  'asset',
  'offboarding',
  'other'
];

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function createRecord(input) {
  input = input || {};

  return {
    recordId: clean(input.recordId),
    workerId: clean(input.workerId),
    type: clean(input.type || 'other'),
    title: clean(input.title),
    status: clean(input.status || 'active'),
    evidenceRef: clean(input.evidenceRef) || null,
    effectiveDate: input.effectiveDate || null,
    expirationDate: input.expirationDate || null,
    source: clean(input.source || 'hr_operations')
  };
}

function validateRecord(record) {
  var failures = [];
  record = record || {};

  if (!record.recordId) failures.push('record_id_required');
  if (!record.workerId) failures.push('worker_id_required');
  if (TYPES.indexOf(record.type) < 0) {
    failures.push('invalid_record_type');
  }

  return {
    valid: failures.length === 0,
    failures: failures
  };
}

function listByWorker(records, workerId) {
  var id = clean(workerId);

  return (Array.isArray(records) ? records : []).filter(function (record) {
    return clean(record.workerId) === id;
  });
}

module.exports = {
  VERSION: VERSION,
  TYPES: TYPES.slice(),
  createRecord: createRecord,
  validateRecord: validateRecord,
  listByWorker: listByWorker
};
