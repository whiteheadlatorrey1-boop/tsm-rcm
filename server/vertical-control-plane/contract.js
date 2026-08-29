'use strict';

/**
 * TSM Vertical Control Plane Contract
 *
 * Every vertical must ultimately normalize into this shape.
 *
 * Domain adapters are responsible for translating domain-specific
 * concepts into this canonical model.
 */

const REQUIRED_FIELDS = [
  'vertical',
  'entities',
  'events',
  'findings',
  'exposures',
  'relationships'
];

const CONTROL_PLANE_VERSION = '1.0.0';

function assertArray(value, field) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${field} must be an array`);
  }
}

function validateEnvelope(envelope) {
  if (!envelope || typeof envelope !== 'object') {
    throw new TypeError('control-plane envelope must be an object');
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in envelope)) {
      throw new Error(
        `control-plane envelope missing required field: ${field}`
      );
    }
  }

  assertArray(envelope.entities, 'entities');
  assertArray(envelope.events, 'events');
  assertArray(envelope.findings, 'findings');
  assertArray(envelope.exposures, 'exposures');
  assertArray(envelope.relationships, 'relationships');

  return true;
}

function createEnvelope(input = {}) {
  const envelope = {
    schemaVersion: CONTROL_PLANE_VERSION,
    vertical: input.vertical || null,

    entities: input.entities || [],
    events: input.events || [],
    findings: input.findings || [],
    exposures: input.exposures || [],
    relationships: input.relationships || [],

    deterministic: input.deterministic || {},
    risk: input.risk || {},
    forecast: input.forecast || {},

    decisions: input.decisions || [],
    explanations: input.explanations || [],

    governance: input.governance || {
      approvalRequired: true,
      approved: false
    },

    actions: input.actions || [],

    persistence: input.persistence || {},
    audit: input.audit || {},
    verification: input.verification || {},

    predictive: input.predictive || {},
    writeback: input.writeback || {
      allowed: false,
      executed: false
    },

    telemetry: input.telemetry || {},

    metadata: input.metadata || {}
  };

  validateEnvelope(envelope);

  return envelope;
}

module.exports = {
  CONTROL_PLANE_VERSION,
  REQUIRED_FIELDS,
  createEnvelope,
  validateEnvelope
};
