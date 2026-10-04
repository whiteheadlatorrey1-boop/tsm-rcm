'use strict';

const VERSION = '13G.0';

const EVIDENCE_TYPES = [
  'application_event',
  'assessment_result',
  'interview_result',
  'offer_event',
  'assignment_event',
  'schedule_event',
  'attendance_event',
  'work_completion',
  'manager_feedback',
  'worker_feedback',
  'other'
];

function normalize(input = {}) {
  if (!input.evidenceId) {
    throw new Error('evidenceId is required');
  }

  if (!input.workerId && !input.candidateId) {
    throw new Error('workerId or candidateId is required');
  }

  if (!EVIDENCE_TYPES.includes(input.type || 'other')) {
    throw new Error(`invalid evidence type: ${input.type}`);
  }

  return {
    evidenceId: String(input.evidenceId),
    type: input.type || 'other',
    candidateId: input.candidateId
      ? String(input.candidateId)
      : null,
    workerId: input.workerId
      ? String(input.workerId)
      : null,
    source: String(input.source || 'ats_hris_wfm'),
    verified: Boolean(input.verified),
    refs: Array.isArray(input.refs)
      ? [...input.refs]
      : [],
    metadata: input.metadata && typeof input.metadata === 'object'
      ? { ...input.metadata }
      : {}
  };
}

function dedupe(records = []) {
  const seen = new Set();
  const output = [];

  for (const record of records) {
    const normalized = normalize(record);

    if (seen.has(normalized.evidenceId)) {
      continue;
    }

    seen.add(normalized.evidenceId);
    output.push(normalized);
  }

  return output;
}

module.exports = {
  VERSION,
  EVIDENCE_TYPES,
  normalize,
  dedupe
};
