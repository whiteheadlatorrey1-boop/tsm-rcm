'use strict';
// Phase 15B — read-only candidate readiness view for the Workforce Intelligence
// Command Center. Wraps the 15A bridge; adds NO scoring rules and performs NO
// writes. Insights/actions come straight from the 15A bridge unchanged.

const bridge = require('../html/js/career/tsm-workforce-readiness-integration');

const VERSION = '15B.0';
// Registry bases that mean "no evidence yet" (score defaults to 0). Showing a
// development gap for a candidate with no data would be misleading.
const NO_EVIDENCE_BASES = new Set(['no-training-data', 'no-scored-events']);

function codedError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function hasNumericScore(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return false;
  return Number.isFinite(Number(value));
}

function buildCandidateReadinessView(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    throw codedError('CANDIDATE_REQUIRED', 'candidate is required');
  }
  if (!hasNumericScore(candidate.readinessScore)) {
    throw codedError('NO_READINESS_SCORE', 'candidate has no numeric readiness score');
  }

  const base = {
    version: VERSION,
    readOnly: true,
    candidateId: candidate.candidateId,
    name: candidate.name || null,
    readinessScore: bridge.normalizeReadinessScore(candidate.readinessScore),
    readinessBasis: candidate.readinessBasis || null,
    isSampleData: candidate.isSampleData === true
  };

  if (NO_EVIDENCE_BASES.has(candidate.readinessBasis)) {
    return Object.assign(base, {
      state: 'no_evidence',
      signal: null,
      insights: [],
      actions: [],
      humanReviewRequired: false,
      note: 'No readiness evidence recorded for this candidate yet.'
    });
  }

  const intel = bridge.buildIntelligence(candidate);
  const signal = intel.signals[0];
  const insights = intel.insights.map((i) => ({
    type: i.type, title: i.title, description: i.description
  }));
  const actions = intel.actions.map((a) => ({
    type: a.type, title: a.title, reason: a.reason,
    requiresHumanReview: a.requiresHumanReview !== false
  }));

  return Object.assign(base, {
    state: insights.length ? insights[0].type : 'no_insight',
    signal: { signalId: signal.signalId, type: signal.type, value: signal.value, source: signal.source },
    insights,
    actions,
    humanReviewRequired: actions.some((a) => a.requiresHumanReview),
    note: insights.length ? null
      : 'No insight or action is generated for this readiness score under the current 15A rules.'
  });
}

// Pure request resolver so the route stays thin and testable without express.
async function resolveReadinessIntelligence(candidateId, getCandidate) {
  if (!candidateId || typeof candidateId !== 'string') {
    return { status: 400, body: { error: 'candidateId is required' } };
  }
  const candidate = await getCandidate(candidateId);
  if (!candidate) return { status: 404, body: { error: 'candidate not found' } };
  try {
    return { status: 200, body: buildCandidateReadinessView(candidate) };
  } catch (err) {
    if (err && err.code === 'NO_READINESS_SCORE') {
      return { status: 422, body: { error: err.message } };
    }
    throw err;
  }
}

module.exports = { VERSION, buildCandidateReadinessView, resolveReadinessIntelligence };
