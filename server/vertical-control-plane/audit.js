'use strict';

/**
 * Canonical audit event factory.
 */

function createAuditEvent(input = {}) {
  return {
    id: input.id ||
      `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,

    eventType: input.eventType || 'CONTROL_PLANE_EVENT',

    vertical: input.vertical || null,

    actor: input.actor || 'system',

    entityId: input.entityId || null,

    decisionId: input.decisionId || null,

    actionId: input.actionId || null,

    before: input.before ?? null,

    after: input.after ?? null,

    timestamp: new Date().toISOString(),

    metadata: input.metadata || {}
  };
}

module.exports = {
  createAuditEvent
};
