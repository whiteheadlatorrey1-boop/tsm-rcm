'use strict';

/**
 * Workforce -> TSM Vertical Control Plane adapter.
 *
 * Pure translation of already-computed Workforce data (a readiness view from
 * workforce-readiness-view.js and an eligibility result from
 * staffing-engine-service.evaluatePlacementEligibility) into the canonical
 * envelope. It calls no engine, no storage, no mutating placement function.
 * Eligibility is a recommendation only: approvalRequired:true / approved:false
 * is applied here and never changed.
 */

const { createEnvelope } = require('../contract');

function fromReadiness(input = {}, view = {}, eligibility = {}) {
  const v = view || {};
  const el = eligibility || {};
  const candidateId = v.candidateId ?? input.candidateId ?? null;
  const insights = Array.isArray(v.insights) ? v.insights : [];
  const viewActions = Array.isArray(v.actions) ? v.actions : [];
  const signal = v.signal || null;

  const findings = insights.map((i) => ({
    type: i.type ?? 'READINESS_INSIGHT',
    title: i.title ?? null,
    description: i.description ?? null,
    source: 'workforce-readiness-view'
  }));
  if (el.eligible === false) {
    findings.push({
      type: 'PLACEMENT_INELIGIBLE',
      reason: el.reason ?? null,
      source: 'staffing-engine-eligibility'
    });
  }

  return createEnvelope({
    vertical: 'workforce',
    entities: candidateId ? [{ type: 'CANDIDATE', id: candidateId, name: v.name ?? null }] : [],
    events: signal ? [{
      type: 'READINESS_SIGNAL',
      signalId: signal.signalId ?? null,
      signalType: signal.type ?? null,
      value: signal.value ?? null,
      source: signal.source ?? 'workforce-readiness-view'
    }] : [],
    findings,
    exposures: [],
    relationships: [],
    decisions: [{
      type: 'PLACEMENT_ELIGIBILITY',
      eligible: el.eligible === true,
      reason: el.reason ?? null,
      readinessScore: el.readinessScore ?? v.readinessScore ?? null,
      requiresApproval: true,
      executed: false,
      source: 'staffing-engine-eligibility'
    }],
    governance: { approvalRequired: true, approved: false },
    actions: viewActions.map((a) => ({
      type: a.type ?? null,
      title: a.title ?? null,
      reason: a.reason ?? null,
      requiresHumanReview: a.requiresHumanReview !== false,
      allowed: false,
      executed: false
    })),
    verification: { evidence: [], explained: false, source: 'workforce-adapter' },
    metadata: {
      source: 'workforce-readiness-view+staffing-engine',
      adapter: 'workforce-adapter',
      readinessBasis: v.readinessBasis ?? null,
      isSampleData: v.isSampleData === true
    }
  });
}

module.exports = { fromReadiness };
