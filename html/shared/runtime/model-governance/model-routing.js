/**
 * model-routing.js
 *
 * Picks a model for a given use case and calls it through a supplied
 * provider adapter map, so routes stop hardcoding tsmGroqComplete and
 * instead express intent ('I need a strategist-quality completion') and
 * let this module resolve which model/provider actually serves it.
 *
 * providerAdapters shape: { groq: async (modelId, prompt, opts) => text, ... }
 */

async function routeModelCall(useCase, prompt, deps) {
  deps = deps || {};
  const listApprovedFor = deps.listApprovedFor;
  const providerAdapters = deps.providerAdapters || {};
  const preferredKey = deps.preferredModelKey || null;
  const opts = deps.opts || {};

  if (!listApprovedFor) {
    throw new Error('model-routing requires listApprovedFor from model-registry');
  }

  const candidates = listApprovedFor(useCase);
  if (!candidates.length) {
    throw new Error('No approved model for use case: ' + useCase);
  }

  const chosen = preferredKey
    ? candidates.find((c) => c.key === preferredKey) || candidates[0]
    : candidates[0];

  const adapter = providerAdapters[chosen.provider];
  if (!adapter) {
    throw new Error('No provider adapter registered for: ' + chosen.provider);
  }

  const startedAt = Date.now();
  const text = await adapter(chosen.modelId, prompt, opts);
  const latencyMs = Date.now() - startedAt;

  return {
    useCase: useCase,
    modelKey: chosen.key,
    provider: chosen.provider,
    text: text,
    latencyMs: latencyMs,
    calledAt: new Date().toISOString(),
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { routeModelCall: routeModelCall };
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.routeModelCall = routeModelCall;
}
