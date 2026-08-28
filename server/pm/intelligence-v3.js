'use strict';

const {
  buildActionQueue,
  summarizeActions
} = require('./action-engine');

const {
  verifyOutcome
} = require('./verification-engine');

const VERSION = 'pm-intelligence-v3';

function buildPmIntelligenceV3(payload = {}) {
  const intelligence = payload.intelligence || payload;

  const decisions =
    intelligence.decisions ||
    payload.decisions ||
    [];

  const existingActions =
    payload.actions ||
    intelligence.actions ||
    buildActionQueue(decisions);

  const actions = existingActions.map(action => ({
    ...action,
    verification: action.verification || {
      required: true,
      verified: false,
      verifiedAt: null,
      verifiedBy: null,
      outcome: null,
      exposureAfter: null,
      notes: null
    }
  }));

  const actionSummary = summarizeActions(actions);

  const totalExposure = Number(
    intelligence?.decisionSummary?.modeledExposure ??
    payload?.decisionSummary?.modeledExposure ??
    payload?.financials?.total_exposure ??
    0
  );

  const verifiedReduction = Number(
    actionSummary.verifiedExposureReduction || 0
  );

  const remainingExposure = Math.max(
    0,
    totalExposure - verifiedReduction
  );

  const criticalOpen = actions.filter(
    a => a.priority === 'CRITICAL' && a.status !== 'VERIFIED'
  ).length;

  const highOpen = actions.filter(
    a => a.priority === 'HIGH' && a.status !== 'VERIFIED'
  ).length;

  return {
    ok: true,
    engine: VERSION,
    generatedAt: new Date().toISOString(),

    portfolio: {
      modeledExposure: totalExposure,
      verifiedExposureReduction: verifiedReduction,
      remainingModeledExposure: remainingExposure,
      criticalOpen,
      highOpen
    },

    actionSummary,

    actions,

    operatingLoop: {
      observe: true,
      understand: decisions.length > 0,
      predict: Boolean(intelligence.forecast),
      decide: decisions.length > 0,
      execute: actions.length > 0,
      verify: actions.some(a => a.status === 'VERIFIED'),
      explain: true
    },

    governance: {
      mode: 'DETERMINISTIC',
      humanApprovalRequired: true,
      sourceSystemWriteback: false,
      llmRequired: false
    }
  };
}

function verifyPmAction(action, input = {}) {
  if (!action) {
    throw new Error('Action is required');
  }

  const verification = verifyOutcome(action, input);

  if (!verification.verified) {
    return {
      ok: false,
      action,
      verification
    };
  }

  if (action.status !== 'RESOLVED') {
    throw new Error('Only RESOLVED actions may be verified');
  }

  const verifiedAction = {
    ...action,
    status: 'VERIFIED',
    updatedAt: verification.verifiedAt,
    verification: {
      ...(action.verification || {}),
      required: true,
      verified: true,
      verifiedAt: verification.verifiedAt,
      verifiedBy: verification.verifiedBy,
      outcome: verification.outcome,
      exposureAfter: verification.exposureAfter,
      notes: verification.notes
    }
  };

  return {
    ok: true,
    action: verifiedAction,
    verification
  };
}

module.exports = {
  VERSION,
  buildPmIntelligenceV3,
  verifyPmAction
};
