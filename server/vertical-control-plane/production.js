'use strict';

/**
 * Production-oriented control-plane orchestration.
 *
 * This layer composes the individual engines without allowing
 * intelligence to bypass governance.
 */

const {
  createEnvelope
} = require('./contract');

const {
  aggregate
} = require('./deterministic');

const {
  calculateRisk
} = require('./risk');

const {
  forecast
} = require('./forecast');

const {
  generateDecision
} = require('./decisions');

const {
  explainDecision
} = require('./explainability');

const {
  createApprovalGate
} = require('./governance');

const {
  createAction
} = require('./actions');

const {
  createAuditEvent
} = require('./audit');

const {
  verifyDecision,
  verifyAction
} = require('./verification');

const {
  decisionTelemetry
} = require('./telemetry');

const {
  saveEnvelope,
  saveDecision,
  saveAction
} = require('./persistence');

const {
  predictionSet
} = require('./predictive');

function runProductionControlPlane(input = {}) {
  const envelope = createEnvelope(input);

  const deterministic = aggregate(
    envelope.findings,
    envelope.exposures
  );

  const risk = calculateRisk({
    severity: deterministic.severity.max,
    exposure: deterministic.exposure.total,
    probability: input.probability || 0
  });

  const numericSeries =
    input.forecastSeries ||
    envelope.events
      .map(event => event.value)
      .filter(Number.isFinite);

  const forecastResult = forecast(
    numericSeries,
    input.forecastPeriods || 1
  );

  const decision = generateDecision({
    vertical: envelope.vertical,
    risk,
    findings: envelope.findings,
    id: input.decisionId
  });

  const explanation = explainDecision(
    decision,
    envelope.findings.flatMap(
      item => item.evidence || []
    )
  );

  const governance = createApprovalGate({
    approvalRequired: decision.requiresApproval
  });

  const action = createAction({
    decisionId: decision.id,
    type:
      input.actionType ||
      `${envelope.vertical}:decision-action`,
    payload:
      input.actionPayload || {}
  });

  const verification = verifyDecision(decision);

  const actionVerification = verifyAction(action);

  const predictions = predictionSet(
    input.predictions || []
  );

  const auditEvent = createAuditEvent({
    eventType: 'CONTROL_PLANE_DECISION_CREATED',
    vertical: envelope.vertical,
    decisionId: decision.id,
    actor: input.actor || 'system',
    metadata: {
      riskScore: risk.score,
      recommendation: decision.recommendation
    }
  });

  const telemetry = decisionTelemetry({
    vertical: envelope.vertical,
    decisionId: decision.id,
    riskScore: risk.score,
    recommendation: decision.recommendation,
    approvalRequired: governance.approvalRequired,
    approved: governance.approved,
    verified: verification.verified
  });

  const result = {
    ...envelope,

    deterministic,

    risk,

    forecast: forecastResult,

    decisions: [decision],

    explanations: [explanation],

    governance,

    actions: [action],

    predictive: {
      predictions
    },

    audit: {
      events: [auditEvent]
    },

    verification: {
      decision: verification,
      action: actionVerification
    },

    telemetry,

    persistence: {
      persisted: false
    }
  };

  const envelopeId = saveEnvelope(result);

  saveDecision(decision);
  saveAction(action);

  result.persistence = {
    persisted: true,
    envelopeId,
    decisionId: decision.id,
    actionId: action.id
  };

  return result;
}

module.exports = {
  runProductionControlPlane
};
