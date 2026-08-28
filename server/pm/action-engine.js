'use strict';

/**
 * TSM PM Action Engine v1
 *
 * Deterministic-first operational action lifecycle.
 *
 * Lifecycle:
 *   OPEN -> ACKNOWLEDGED -> IN_PROGRESS -> RESOLVED -> VERIFIED
 *
 * No source-system writeback is performed here.
 * Actions remain TSM-side until explicitly integrated with an external system.
 */

const VERSION = 'pm-action-engine-v1';

const VALID_TRANSITIONS = {
  OPEN: ['ACKNOWLEDGED'],
  ACKNOWLEDGED: ['IN_PROGRESS', 'OPEN'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['VERIFIED', 'IN_PROGRESS'],
  VERIFIED: []
};

function now() {
  return new Date().toISOString();
}

function clean(value, fallback = '') {
  return value == null || value === '' ? fallback : String(value);
}

function actionFromDecision(decision) {
  const id = clean(decision.id, `PM-ACTION-${Date.now()}`);

  return {
    id: `ACT-${id}`,
    decisionId: id,
    entityId: clean(decision.entityId),
    domain: clean(decision.domain),
    priority: clean(decision.priority, 'MEDIUM'),
    finding: clean(decision.finding, 'Management review required'),
    exposure: Number(decision.exposure || 0),
    action: clean(decision.action, 'Review and remediate the identified condition.'),
    owner: clean(decision.owner, 'Property Management'),
    urgency: clean(decision.urgency, 'Next business day'),
    status: 'OPEN',
    createdAt: now(),
    updatedAt: now(),
    verification: {
      required: true,
      verified: false,
      verifiedAt: null,
      verifiedBy: null,
      outcome: null,
      exposureAfter: null,
      notes: null
    },
    governance: {
      humanApprovalRequired: true,
      sourceSystemWriteback: false
    }
  };
}

function buildActionQueue(decisions = []) {
  return decisions
    .filter(Boolean)
    .map(actionFromDecision)
    .sort((a, b) => {
      const rank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return (rank[b.priority] || 0) - (rank[a.priority] || 0)
        || b.exposure - a.exposure;
    });
}

function transition(action, nextStatus, metadata = {}) {
  if (!action || !nextStatus) {
    throw new Error('Action and next status are required');
  }

  const current = action.status || 'OPEN';
  const allowed = VALID_TRANSITIONS[current] || [];

  if (!allowed.includes(nextStatus)) {
    throw new Error(
      `Invalid PM action transition: ${current} -> ${nextStatus}`
    );
  }

  const updated = {
    ...action,
    status: nextStatus,
    updatedAt: now()
  };

  if (nextStatus === 'VERIFIED') {
    updated.verification = {
      ...(action.verification || {}),
      required: true,
      verified: true,
      verifiedAt: now(),
      verifiedBy: clean(metadata.verifiedBy, 'PM Manager'),
      outcome: clean(metadata.outcome, 'CONDITION_VERIFIED'),
      exposureAfter:
        metadata.exposureAfter == null
          ? action.exposure
          : Number(metadata.exposureAfter),
      notes: clean(metadata.notes, '')
    };
  }

  return updated;
}

function verifyAction(action, verification = {}) {
  if (!action) throw new Error('Action is required');

  if (action.status !== 'RESOLVED') {
    throw new Error('Only RESOLVED actions may be verified');
  }

  return transition(action, 'VERIFIED', verification);
}

function summarizeActions(actions = []) {
  const counts = {
    total: actions.length,
    open: 0,
    acknowledged: 0,
    inProgress: 0,
    resolved: 0,
    verified: 0
  };

  let exposureAtRisk = 0;
  let verifiedExposureReduction = 0;

  for (const action of actions) {
    const status = action.status || 'OPEN';

    if (status === 'OPEN') counts.open++;
    if (status === 'ACKNOWLEDGED') counts.acknowledged++;
    if (status === 'IN_PROGRESS') counts.inProgress++;
    if (status === 'RESOLVED') counts.resolved++;
    if (status === 'VERIFIED') counts.verified++;

    if (status !== 'VERIFIED') {
      exposureAtRisk += Number(action.exposure || 0);
    }

    if (
      status === 'VERIFIED' &&
      action.verification &&
      action.verification.exposureAfter != null
    ) {
      verifiedExposureReduction += Math.max(
        0,
        Number(action.exposure || 0) -
          Number(action.verification.exposureAfter || 0)
      );
    }
  }

  return {
    ...counts,
    exposureAtRisk,
    verifiedExposureReduction
  };
}

module.exports = {
  VERSION,
  VALID_TRANSITIONS,
  actionFromDecision,
  buildActionQueue,
  transition,
  verifyAction,
  summarizeActions
};
