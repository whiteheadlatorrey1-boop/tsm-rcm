'use strict';

const VERSION = '13D.0';

function create(input = {}) {
  if (!input.workerId) {
    throw new Error('workerId is required');
  }

  return {
    workerId: String(input.workerId),
    candidateId: input.candidateId
      ? String(input.candidateId)
      : null,
    employeeId: input.employeeId
      ? String(input.employeeId)
      : null,
    employmentState: input.employmentState || 'prehire',
    role: String(input.role || ''),
    department: String(input.department || ''),
    managerId: input.managerId
      ? String(input.managerId)
      : null,
    competencies: Array.isArray(input.competencies)
      ? [...input.competencies]
      : [],
    availabilityRefs: [],
    evidenceRefs: []
  };
}

function linkCandidate(profile, candidateId) {
  return {
    ...profile,
    candidateId: String(candidateId)
  };
}

function linkEmployee(profile, employeeId) {
  return {
    ...profile,
    employeeId: String(employeeId)
  };
}

module.exports = {
  VERSION,
  create,
  linkCandidate,
  linkEmployee
};
