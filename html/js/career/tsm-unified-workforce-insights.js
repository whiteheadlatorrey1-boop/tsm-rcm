'use strict';

const {
  INSIGHT_TYPES
} = require('./tsm-unified-workforce-intelligence-contract');

const VERSION = '14D.0';

function create(input = {}) {
  if (!input.insightId) {
    throw new Error('insightId is required');
  }

  if (!INSIGHT_TYPES.includes(input.type)) {
    throw new Error(`invalid insight type: ${input.type}`);
  }

  if (!input.candidateId && !input.workerId) {
    throw new Error('candidateId or workerId is required');
  }

  return {
    insightId: String(input.insightId),
    type: input.type,
    candidateId: input.candidateId
      ? String(input.candidateId)
      : null,
    workerId: input.workerId
      ? String(input.workerId)
      : null,
    title: String(input.title || ''),
    description: String(input.description || ''),
    confidence: Number.isFinite(input.confidence)
      ? input.confidence
      : null,
    evidenceRefs: Array.isArray(input.evidenceRefs)
      ? [...input.evidenceRefs]
      : [],
    generatedBy: String(input.generatedBy || 'deterministic_rule')
  };
}

function buildFromSignals(signals = []) {
  const insights = [];

  for (const signal of signals) {
    if (signal.type === 'readiness' &&
        Number.isFinite(signal.value)) {
      if (signal.value >= 80) {
        insights.push(create({
          insightId: `READINESS-${signal.signalId}`,
          type: 'qualification',
          candidateId: signal.candidateId,
          workerId: signal.workerId,
          title: 'Readiness qualification signal',
          description: 'Readiness evidence meets the qualification threshold.',
          confidence: signal.value,
          evidenceRefs: signal.evidenceRefs
        }));
      } else if (signal.value < 70) {
        insights.push(create({
          insightId: `GAP-${signal.signalId}`,
          type: 'gap',
          candidateId: signal.candidateId,
          workerId: signal.workerId,
          title: 'Readiness development gap',
          description: 'Readiness evidence indicates a development opportunity.',
          confidence: signal.value,
          evidenceRefs: signal.evidenceRefs
        }));
      }
    }

    if (signal.type === 'availability' &&
        signal.status === 'available') {
      insights.push(create({
        insightId: `AVAIL-${signal.signalId}`,
        type: 'opportunity',
        candidateId: signal.candidateId,
        workerId: signal.workerId,
        title: 'Workforce availability signal',
        description: 'Worker availability can be considered by downstream staffing workflows.',
        confidence: 1,
        evidenceRefs: signal.evidenceRefs
      }));
    }
  }

  return insights;
}

module.exports = {
  VERSION,
  create,
  buildFromSignals
};
