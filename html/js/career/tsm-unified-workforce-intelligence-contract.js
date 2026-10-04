'use strict';

const VERSION = '14A.0';

const CONTRACT = 'unified_workforce_intelligence';

const SIGNAL_TYPES = [
  'training',
  'readiness',
  'competency',
  'application',
  'staffing',
  'placement',
  'employment',
  'workforce',
  'performance',
  'availability',
  'evidence'
];

const INSIGHT_TYPES = [
  'strength',
  'gap',
  'qualification',
  'risk',
  'opportunity',
  'workflow',
  'development'
];

function normalizeCandidateId(value) {
  const id = String(value || '').trim();

  if (!id) {
    throw new Error('candidateId is required');
  }

  return id;
}

function create(input = {}) {
  return {
    contract: CONTRACT,
    version: VERSION,
    candidateId: normalizeCandidateId(input.candidateId),
    workerId: input.workerId
      ? String(input.workerId)
      : null,
    signals: [],
    insights: [],
    actions: [],
    evidenceRefs: [],
    provenance: []
  };
}

module.exports = {
  VERSION,
  CONTRACT,
  SIGNAL_TYPES,
  INSIGHT_TYPES,
  normalizeCandidateId,
  create
};
