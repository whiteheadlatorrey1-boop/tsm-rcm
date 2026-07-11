/**
 * model-registry.js
 *
 * Declares which models are known to the platform, what they're approved
 * for, and their basic cost/latency profile. Nothing calls a model
 * directly from here -- this is metadata that model-routing.js consumes.
 */

const MODELS = {
  'groq:llama-3.1-70b': {
    provider: 'groq',
    modelId: 'llama-3.1-70b-versatile',
    approvedFor: ['general', 'strategist', 'situation-room', 'collective-bnca', 'wip-command-center'],
    costPer1kTokensUsd: 0.00059,
    avgLatencyMs: 700,
    status: 'active',
  },
  'groq:llama-3.1-8b': {
    provider: 'groq',
    modelId: 'llama-3.1-8b-instant',
    approvedFor: ['general', 'quick-classification'],
    costPer1kTokensUsd: 0.00005,
    avgLatencyMs: 250,
    status: 'active',
  },
};

function getModel(key) {
  const model = MODELS[key];
  if (!model) throw new Error('Unknown model: ' + key);
  return Object.assign({ key: key }, model);
}

function listApprovedFor(useCase) {
  return Object.keys(MODELS)
    .filter((key) => MODELS[key].approvedFor.indexOf(useCase) !== -1 && MODELS[key].status === 'active')
    .map((key) => Object.assign({ key: key }, MODELS[key]));
}

function registerModel(key, definition) {
  MODELS[key] = Object.assign({ status: 'active' }, definition);
  return getModel(key);
}

function deprecateModel(key) {
  if (!MODELS[key]) throw new Error('Unknown model: ' + key);
  MODELS[key].status = 'deprecated';
  return getModel(key);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MODELS: MODELS, getModel: getModel, listApprovedFor: listApprovedFor, registerModel: registerModel, deprecateModel: deprecateModel };
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.modelRegistry = { getModel: getModel, listApprovedFor: listApprovedFor, registerModel: registerModel, deprecateModel: deprecateModel };
}
