'use strict';

/**
 * TSM Control Plane Persistence Adapter
 *
 * Safe default:
 *   - process-local memory
 *
 * Production:
 *   - can be replaced by Postgres without changing the control-plane API.
 */

const decisions = new Map();
const actions = new Map();
const envelopes = new Map();

function saveEnvelope(envelope) {
  const id =
    envelope.metadata?.requestId ||
    envelope.metadata?.correlationId ||
    `${envelope.vertical}:${Date.now()}`;

  envelopes.set(id, {
    id,
    vertical: envelope.vertical,
    savedAt: new Date().toISOString(),
    envelope
  });

  return id;
}

function saveDecision(decision) {
  if (!decision?.id) {
    throw new Error('decision.id is required');
  }

  decisions.set(decision.id, {
    ...decision,
    persistedAt: new Date().toISOString()
  });

  return decisions.get(decision.id);
}

function saveAction(action) {
  if (!action?.id) {
    throw new Error('action.id is required');
  }

  actions.set(action.id, {
    ...action,
    persistedAt: new Date().toISOString()
  });

  return actions.get(action.id);
}

function getDecision(id) {
  return decisions.get(id) || null;
}

function getAction(id) {
  return actions.get(id) || null;
}

function getEnvelope(id) {
  return envelopes.get(id) || null;
}

function snapshot() {
  return {
    envelopes: envelopes.size,
    decisions: decisions.size,
    actions: actions.size
  };
}

function clear() {
  envelopes.clear();
  decisions.clear();
  actions.clear();
}

module.exports = {
  saveEnvelope,
  saveDecision,
  saveAction,
  getDecision,
  getAction,
  getEnvelope,
  snapshot,
  clear
};
