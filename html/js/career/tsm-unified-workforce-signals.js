'use strict';

const {
  SIGNAL_TYPES
} = require('./tsm-unified-workforce-intelligence-contract');

const VERSION = '14B.0';

function normalize(input = {}) {
  if (!input.signalId) {
    throw new Error('signalId is required');
  }

  if (!SIGNAL_TYPES.includes(input.type)) {
    throw new Error(`invalid signal type: ${input.type}`);
  }

  if (!input.candidateId && !input.workerId) {
    throw new Error('candidateId or workerId is required');
  }

  return {
    signalId: String(input.signalId),
    type: input.type,
    candidateId: input.candidateId
      ? String(input.candidateId)
      : null,
    workerId: input.workerId
      ? String(input.workerId)
      : null,
    value: input.value ?? null,
    status: String(input.status || ''),
    source: String(input.source || ''),
    evidenceRefs: Array.isArray(input.evidenceRefs)
      ? [...input.evidenceRefs]
      : [],
    provenance: input.provenance && typeof input.provenance === 'object'
      ? { ...input.provenance }
      : {}
  };
}

function dedupe(signals = []) {
  const seen = new Set();
  const output = [];

  for (const signal of signals) {
    const normalized = normalize(signal);

    if (seen.has(normalized.signalId)) {
      continue;
    }

    seen.add(normalized.signalId);
    output.push(normalized);
  }

  return output;
}

module.exports = {
  VERSION,
  normalize,
  dedupe
};
