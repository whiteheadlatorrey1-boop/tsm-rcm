'use strict';

/**
 * Canonical evidence and lineage layer.
 */

function normalizeEvidence(input = {}) {
  return {
    id: input.id || `evidence-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    source: input.source || 'unknown',
    sourceType: input.sourceType || 'application',
    sourceId: input.sourceId || null,
    field: input.field || null,
    value: input.value,
    confidence:
      typeof input.confidence === 'number'
        ? Math.max(0, Math.min(1, input.confidence))
        : 1,
    observedAt: input.observedAt || new Date().toISOString(),
    lineage: input.lineage || []
  };
}

function attachEvidence(target, evidence) {
  const list = Array.isArray(target.evidence)
    ? target.evidence
    : [];

  return {
    ...target,
    evidence: [
      ...list,
      normalizeEvidence(evidence)
    ]
  };
}

function collectEvidence(items = []) {
  return items.flatMap(item =>
    Array.isArray(item.evidence)
      ? item.evidence
      : []
  );
}

module.exports = {
  normalizeEvidence,
  attachEvidence,
  collectEvidence
};
