'use strict';

/*
 * TSM Phase 11A — HR Operations Contract
 *
 * Pure contract layer.
 * No persistence.
 * No Registry writes.
 * No staffing lifecycle writes.
 * No UI mutations.
 */

var VERSION = '11A.0';

var CONTRACT = 'hr_operations';

var EMPLOYMENT_STATES = [
  'prehire',
  'active',
  'leave',
  'offboarding',
  'ended'
];

var CASE_STATES = [
  'open',
  'in_progress',
  'pending',
  'resolved',
  'closed'
];

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function normalizeWorker(worker) {
  worker = worker || {};

  return {
    workerId: clean(worker.workerId || worker.candidateId || worker.id),
    candidateId: clean(worker.candidateId),
    firstName: clean(worker.firstName),
    lastName: clean(worker.lastName),
    email: clean(worker.email),
    roleId: clean(worker.roleId),
    roleName: clean(worker.roleName),
    department: clean(worker.department)
  };
}

function createContract(input) {
  input = input || {};

  return {
    contract: CONTRACT,
    version: VERSION,
    worker: normalizeWorker(input.worker),
    employment: {
      state: clean(input.employmentState || 'prehire'),
      startDate: input.startDate || null,
      endDate: input.endDate || null
    },
    onboarding: input.onboarding || null,
    offboarding: input.offboarding || null,
    records: Array.isArray(input.records)
      ? input.records.slice()
      : [],
    cases: Array.isArray(input.cases)
      ? input.cases.slice()
      : [],
    complianceEvidence: Array.isArray(input.complianceEvidence)
      ? input.complianceEvidence.slice()
      : [],
    provenance: {
      source: CONTRACT,
      version: VERSION
    }
  };
}

function createEmptyContract(workerId) {
  return createContract({
    worker: {
      workerId: workerId
    }
  });
}

module.exports = {
  VERSION: VERSION,
  CONTRACT: CONTRACT,
  EMPLOYMENT_STATES: EMPLOYMENT_STATES.slice(),
  CASE_STATES: CASE_STATES.slice(),
  normalizeWorker: normalizeWorker,
  createContract: createContract,
  createEmptyContract: createEmptyContract
};
