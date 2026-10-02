'use strict';

const VERSION = '13A.0';

const CONTRACT = 'ats_hris_wfm';

const APPLICATION_STATES = [
  'draft',
  'submitted',
  'screening',
  'interview',
  'assessment',
  'offer',
  'withdrawn',
  'rejected',
  'hired',
  'closed'
];

const REQUISITION_STATES = [
  'draft',
  'open',
  'on_hold',
  'filled',
  'cancelled',
  'closed'
];

const ASSIGNMENT_STATES = [
  'planned',
  'scheduled',
  'active',
  'completed',
  'cancelled'
];

const WORKER_STATES = [
  'candidate',
  'prehire',
  'active',
  'inactive',
  'ended'
];

function normalizeId(value, fallback) {
  return String(value || fallback || '').trim();
}

function normalizeCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('candidate is required');
  }

  const candidateId = normalizeId(
    candidate.candidateId,
    candidate.id
  );

  if (!candidateId) {
    throw new Error('candidateId is required');
  }

  return {
    candidateId,
    name: String(candidate.name || '').trim(),
    email: String(candidate.email || '').trim()
  };
}

function normalizeRequisition(requisition) {
  if (!requisition || typeof requisition !== 'object') {
    throw new Error('requisition is required');
  }

  const requisitionId = normalizeId(
    requisition.requisitionId,
    requisition.id
  );

  if (!requisitionId) {
    throw new Error('requisitionId is required');
  }

  return {
    requisitionId,
    accountId: normalizeId(requisition.accountId),
    title: String(requisition.title || '').trim(),
    state: requisition.state || 'draft'
  };
}

function createContract(input = {}) {
  return {
    contract: CONTRACT,
    version: VERSION,
    candidate: input.candidate
      ? normalizeCandidate(input.candidate)
      : null,
    requisition: input.requisition
      ? normalizeRequisition(input.requisition)
      : null,
    application: null,
    worker: null,
    assignment: null,
    evidence: []
  };
}

module.exports = {
  VERSION,
  CONTRACT,
  APPLICATION_STATES,
  REQUISITION_STATES,
  ASSIGNMENT_STATES,
  WORKER_STATES,
  normalizeCandidate,
  normalizeRequisition,
  createContract
};
