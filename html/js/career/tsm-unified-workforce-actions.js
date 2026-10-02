'use strict';

const VERSION = '14E.0';

const ACTION_TYPES = [
  'train',
  'practice',
  'verify',
  'interview',
  'review',
  'contact',
  'submit',
  'follow_up',
  'onboard',
  'schedule',
  'escalate'
];

function create(input = {}) {
  if (!input.actionId) {
    throw new Error('actionId is required');
  }

  if (!ACTION_TYPES.includes(input.type)) {
    throw new Error(`invalid action type: ${input.type}`);
  }

  return {
    actionId: String(input.actionId),
    type: input.type,
    candidateId: input.candidateId
      ? String(input.candidateId)
      : null,
    workerId: input.workerId
      ? String(input.workerId)
      : null,
    title: String(input.title || ''),
    reason: String(input.reason || ''),
    evidenceRefs: Array.isArray(input.evidenceRefs)
      ? [...input.evidenceRefs]
      : [],
    requiresHumanReview: input.requiresHumanReview !== false,
    status: 'proposed'
  };
}

function actionsFromInsights(insights = []) {
  const actions = [];

  for (const insight of insights) {
    if (insight.type === 'gap') {
      actions.push(create({
        actionId: `TRAIN-${insight.insightId}`,
        type: 'train',
        candidateId: insight.candidateId,
        workerId: insight.workerId,
        title: 'Targeted development',
        reason: insight.description,
        evidenceRefs: insight.evidenceRefs
      }));
    }

    if (insight.type === 'qualification') {
      actions.push(create({
        actionId: `REVIEW-${insight.insightId}`,
        type: 'review',
        candidateId: insight.candidateId,
        workerId: insight.workerId,
        title: 'Human qualification review',
        reason: insight.description,
        evidenceRefs: insight.evidenceRefs
      }));
    }

    if (insight.type === 'opportunity') {
      actions.push(create({
        actionId: `FOLLOW-${insight.insightId}`,
        type: 'follow_up',
        candidateId: insight.candidateId,
        workerId: insight.workerId,
        title: 'Review workforce opportunity',
        reason: insight.description,
        evidenceRefs: insight.evidenceRefs
      }));
    }
  }

  return actions;
}

module.exports = {
  VERSION,
  ACTION_TYPES,
  create,
  actionsFromInsights
};
