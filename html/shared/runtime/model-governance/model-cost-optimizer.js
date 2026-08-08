/**
 * model-cost-optimizer.js
 *
 * Tracks per-call token/cost estimates (using model-registry's
 * costPer1kTokensUsd) and rolls them up by domain/tenant so cost can be
 * attributed the same way the WIP Command Center already attributes
 * readiness scores per vertical.
 */

class ModelCostOptimizer {
  constructor() {
    this._entries = [];
  }

  recordCall(opts) {
    const modelKey = opts.modelKey;
    const domain = opts.domain || 'unknown';
    const tenantId = opts.tenantId || null;
    const promptTokens = opts.promptTokens || 0;
    const completionTokens = opts.completionTokens || 0;
    const costPer1kTokensUsd = opts.costPer1kTokensUsd || 0;

    const totalTokens = promptTokens + completionTokens;
    const estimatedCostUsd = (totalTokens / 1000) * costPer1kTokensUsd;

    const entry = {
      modelKey: modelKey,
      domain: domain,
      tenantId: tenantId,
      promptTokens: promptTokens,
      completionTokens: completionTokens,
      totalTokens: totalTokens,
      estimatedCostUsd: estimatedCostUsd,
      ts: new Date().toISOString(),
    };
    this._entries.push(entry);
    return entry;
  }

  totalCostByDomain() {
    const totals = {};
    this._entries.forEach(function (e) {
      totals[e.domain] = (totals[e.domain] || 0) + e.estimatedCostUsd;
    });
    return totals;
  }

  totalCostByModel() {
    const totals = {};
    this._entries.forEach(function (e) {
      totals[e.modelKey] = (totals[e.modelKey] || 0) + e.estimatedCostUsd;
    });
    return totals;
  }

  recentEntries(limit) {
    return this._entries.slice(-(limit || 50));
  }
}

const modelCostOptimizer = new ModelCostOptimizer();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ModelCostOptimizer: ModelCostOptimizer, modelCostOptimizer: modelCostOptimizer };
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.modelCostOptimizer = modelCostOptimizer;
}
