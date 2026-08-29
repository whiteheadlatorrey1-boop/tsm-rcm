'use strict';

/**
 * Canonical entity relationship layer.
 */

function relationship(input = {}) {
  if (!input.from || !input.to || !input.type) {
    throw new Error(
      'relationship requires from, to and type'
    );
  }

  return {
    id:
      input.id ||
      `rel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,

    from: input.from,

    to: input.to,

    type: input.type,

    confidence:
      typeof input.confidence === 'number'
        ? Math.max(0, Math.min(1, input.confidence))
        : 1,

    source: input.source || null,

    createdAt: new Date().toISOString()
  };
}

function graph(relationships = []) {
  return relationships.map(relationship);
}

module.exports = {
  relationship,
  graph
};
