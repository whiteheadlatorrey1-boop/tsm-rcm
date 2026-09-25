'use strict';

/**
 * AI Template Assistance — Phase 9
 *
 * This module prepares a structured template suggestion from technician
 * supplied context. It does NOT execute actions, write to ServiceNow,
 * confirm technician intent, or authorize an Action Gate transition.
 *
 * Deterministic template-registry.js remains the rendering authority.
 */

const templateRegistry = require('./template-registry');

const SUGGESTION_TYPES = Object.freeze([
  'RETURN_TO_INVENTORY',
  'DEVICE_REPLACEMENT',
  'HARDWARE_SWAP',
  'LOANER_RETURN',
  'WARRANTY_DEPOT_RETURN',
  'DEVICE_REASSIGNMENT'
]);

const KEYWORDS = Object.freeze({
  RETURN_TO_INVENTORY: [
    'return to inventory',
    'retire',
    'retired',
    'stock',
    'inventory'
  ],
  DEVICE_REPLACEMENT: [
    'replacement',
    'replace device',
    'new device',
    'failed device'
  ],
  HARDWARE_SWAP: [
    'hardware swap',
    'swap hardware',
    'swap device',
    'exchange hardware'
  ],
  LOANER_RETURN: [
    'loaner return',
    'return loaner',
    'loaner'
  ],
  WARRANTY_DEPOT_RETURN: [
    'warranty depot',
    'depot',
    'warranty return'
  ],
  DEVICE_REASSIGNMENT: [
    'reassign',
    'reassignment',
    'new user',
    'assigned to another'
  ]
});

function normalize(value) {
  return typeof value === 'string'
    ? value.trim().toLowerCase()
    : '';
}

function scoreTemplate(templateId, text) {
  const normalized = normalize(text);
  if (!normalized) return 0;

  return (KEYWORDS[templateId] || []).reduce(
    (score, keyword) =>
      normalized.includes(keyword) ? score + 1 : score,
    0
  );
}

/**
 * suggestTemplate(context)
 *
 * Returns a deterministic suggestion envelope. The caller may later place
 * an actual AI model behind this boundary, but the output contract remains
 * controlled.
 */
function suggestTemplate(context = {}) {
  const ticketText = [
    context.shortDescription,
    context.description,
    context.taskType,
    context.reason,
    context.notes
  ]
    .filter(value => typeof value === 'string')
    .join(' ');

  const scores = SUGGESTION_TYPES.map(templateId => ({
    templateId,
    score: scoreTemplate(templateId, ticketText)
  }));

  scores.sort((a, b) => b.score - a.score);

  const selected = scores[0];

  if (!selected || selected.score === 0) {
    return {
      suggested: false,
      templateId: null,
      confidence: 'LOW',
      reason: 'No deterministic template signal found.',
      candidateTemplates: scores.map(item => item.templateId),
      aiGenerated: false,
      technicianConfirmed: false,
      executable: false
    };
  }

  const tpl = templateRegistry
    .listTemplates()
    .find(item => item.id === selected.templateId);

  return {
    suggested: true,
    templateId: selected.templateId,
    label: tpl ? tpl.label : selected.templateId,
    confidence: selected.score >= 2 ? 'HIGH' : 'MEDIUM',
    reason: `Matched ${selected.score} controlled template signal(s).`,
    candidateTemplates: scores.map(item => item.templateId),
    aiGenerated: false,
    technicianConfirmed: false,
    executable: false
  };
}

/**
 * prepareSuggestion(context)
 *
 * Produces a suggestion plus only technician-supplied field values.
 * Missing fields remain missing; nothing is invented.
 */
function prepareSuggestion(context = {}) {
  const suggestion = suggestTemplate(context);

  const fields = context.fields && typeof context.fields === 'object'
    ? { ...context.fields }
    : {};

  return {
    ...suggestion,
    fields,
    renderedPreview: null,
    technicianConfirmed: false,
    executable: false
  };
}

module.exports = {
  SUGGESTION_TYPES,
  suggestTemplate,
  prepareSuggestion
};
