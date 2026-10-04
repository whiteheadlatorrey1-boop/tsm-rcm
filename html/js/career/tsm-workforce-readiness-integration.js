'use strict';

/**
 * TSM Phase 15A
 * Workforce Readiness Integration Bridge
 *
 * Purpose:
 *   Translate the EXISTING readiness result into the Phase 14
 *   Unified Workforce Intelligence contract.
 *
 * Ownership:
 *   - Candidate Registry remains canonical identity/evidence.
 *   - Professional Readiness remains authoritative for readiness scoring.
 *   - Unified Workforce Intelligence interprets the signal.
 *   - No persistence.
 *   - No application/placement/employment writes.
 */

const intelligenceContract =
  require('./tsm-unified-workforce-intelligence-contract');

const signalsModel =
  require('./tsm-unified-workforce-signals');

const insightsModel =
  require('./tsm-unified-workforce-insights');

const actionsModel =
  require('./tsm-unified-workforce-actions');

const VERSION = '15A.0';

function assertCandidateId(candidateId) {
  if (!candidateId || typeof candidateId !== 'string') {
    throw new Error('candidateId is required');
  }
}

function normalizeReadinessScore(value) {
  // Number(null), Number('') and Number(false) are 0; a missing score must not
  // silently become a zero-readiness score.
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
    throw new Error('readinessScore must be numeric');
  }

  const score = Number(value);

  if (!Number.isFinite(score)) {
    throw new Error('readinessScore must be numeric');
  }

  return Math.max(0, Math.min(100, score));
}

function buildReadinessSignal(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('candidate is required');
  }

  assertCandidateId(candidate.candidateId);

  const score = normalizeReadinessScore(candidate.readinessScore);

  return signalsModel.normalize({
    signalId: `readiness:${candidate.candidateId}`,
    candidateId: candidate.candidateId,
    type: 'readiness',
    value: score,
    source: 'professional_readiness',
    evidenceRefs: Array.isArray(candidate.evidenceRefs)
      ? candidate.evidenceRefs
      : []
  });
}

function buildIntelligence(candidate) {
  assertCandidateId(candidate && candidate.candidateId);

  const contract = intelligenceContract.create({
    candidateId: candidate.candidateId,
    workerId: candidate.workerId
  });

  const signal = buildReadinessSignal(candidate);

  const insights = insightsModel.buildFromSignals([signal]);

  const actions = actionsModel.actionsFromInsights(insights);

  return {
    version: VERSION,
    contract,
    signals: [signal],
    insights,
    actions
  };
}

module.exports = {
  VERSION,
  normalizeReadinessScore,
  buildReadinessSignal,
  buildIntelligence
};
