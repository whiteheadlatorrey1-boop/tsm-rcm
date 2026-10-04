'use strict';

const VERSION = '14F.0';

function build(input = {}) {
  const signals = Array.isArray(input.signals)
    ? [...input.signals]
    : [];

  const insights = Array.isArray(input.insights)
    ? [...input.insights]
    : [];

  const actions = Array.isArray(input.actions)
    ? [...input.actions]
    : [];

  return {
    version: VERSION,
    candidateId: input.candidateId
      ? String(input.candidateId)
      : null,
    workerId: input.workerId
      ? String(input.workerId)
      : null,
    signalCount: signals.length,
    insightCount: insights.length,
    actionCount: actions.length,
    qualificationSignals: insights.filter(
      x => x.type === 'qualification'
    ).length,
    gapSignals: insights.filter(
      x => x.type === 'gap'
    ).length,
    opportunitySignals: insights.filter(
      x => x.type === 'opportunity'
    ).length,
    humanReviewActions: actions.filter(
      x => x.requiresHumanReview !== false
    ).length,
    evidenceRefs: Array.isArray(input.evidenceRefs)
      ? [...input.evidenceRefs]
      : []
  };
}

module.exports = {
  VERSION,
  build
};
