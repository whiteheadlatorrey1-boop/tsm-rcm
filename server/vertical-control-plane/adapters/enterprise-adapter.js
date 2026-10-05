'use strict';

/**
 * Enterprise -> TSM Vertical Control Plane adapter.
 *
 * Pure translation of enterprise-orchestrator.execute() output into the
 * canonical envelope. It never calls the engines, never approves anything,
 * and never writes back. The Enterprise pipeline (enrich -> BNCA decide ->
 * explain) has no human gate of its own; the envelope default
 * approvalRequired:true / approved:false is applied here and never changed.
 */

const { createEnvelope } = require('../contract');

const CONTEXT_ENTITY_KEYS = ['customer', 'supplier', 'product', 'quote', 'invoice', 'compliance', 'audit'];

function fromOrchestration(input = {}, result = {}) {
  const res = result || {};
  const ctx = Object.assign({}, res.context, input);
  const enrichment = res.enrichment || {};
  const decision = res.decision || {};
  const expl = res.explainability || {};
  const caps = Array.isArray(enrichment.capabilities) ? enrichment.capabilities : [];
  const domain = enrichment.vertical ?? ctx.vertical ?? null;
  const entityId = typeof enrichment.entity === 'string' ? enrichment.entity
    : (typeof ctx.entity === 'string' ? ctx.entity : null);

  const entities = [];
  if (entityId) entities.push({ type: 'ENTITY', id: entityId, domain });
  for (const k of CONTEXT_ENTITY_KEYS) {
    const v = ctx[k];
    if (v && typeof v === 'object' && v.id) entities.push({ type: k.toUpperCase(), id: v.id });
  }

  const rec = {
    action: decision.action ?? null,
    priority: decision.priority ?? null,
    confidence: decision.confidence ?? null,
    driver: decision.driver ?? null,
    reason: decision.reason ?? null
  };

  return createEnvelope({
    vertical: 'enterprise',
    entities,
    events: [{
      type: 'ENTERPRISE_ORCHESTRATION',
      ok: res.ok === true,
      objective: ctx.objective ?? null,
      totalCapabilities: enrichment.totalCapabilities ?? null,
      relevantCapabilities: enrichment.summary ? (enrichment.summary.relevantCapabilities ?? null) : null,
      sourceTimestamp: res.timestamp ?? null
    }],
    findings: caps.map((c) => ({
      type: 'CAPABILITY_SIGNAL',
      id: c.id ?? null,
      title: c.title ?? null,
      score: c.score ?? null,
      source: 'enterprise-enrichment'
    })),
    exposures: [],
    relationships: [],
    // Used only if the contract defines a decision field; createEnvelope ignores unknown keys.
    decision: Object.assign({}, rec, { source: 'bnca-engine', executed: false }),
    governance: { approvalRequired: true, approved: false },
    actions: rec.action && rec.action !== 'NO_ACTION'
      ? [Object.assign({ type: 'BNCA_RECOMMENDATION' }, rec, { allowed: false, executed: false })]
      : [],
    verification: {
      evidence: Array.isArray(expl.evidence) ? expl.evidence : [],
      explained: Boolean(expl.why),
      source: 'explainability-engine'
    },
    audit: {
      explainability: {
        decision: expl.decision ?? null,
        why: expl.why ?? null,
        reasoning: expl.reasoning ?? null,
        confidence: expl.confidence ?? null
      },
      decisionTrace: decision.explainability ?? null
    },
    writeback: { allowed: false, executed: false },
    telemetry: { sourceTimestamp: res.timestamp ?? null },
    metadata: {
      source: 'enterprise/enterprise-orchestrator',
      adapter: 'enterprise-adapter',
      domain,
      objective: ctx.objective ?? null,
      humanGateInSourcePipeline: false
    }
  });
}

module.exports = { fromOrchestration };
