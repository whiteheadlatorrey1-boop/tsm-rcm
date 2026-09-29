'use strict';

/**
 * Phase 7A - Professional Readiness model (pure, unwired).
 *
 * Reads Candidate Registry training events and produces a per-dimension
 * readiness assessment with provenance. It does NOT replace
 * computeReadinessScore() in candidate-registry-service.js; that legacy
 * weighted average stays canonical until 7D wires this in deliberately.
 *
 * Rules:
 *  - Only SCORED events count as evidence. Unscored events are ignored.
 *  - Event types with no mapping are reported as unmapped, never guessed.
 *  - A dimension with no evidence has score null ("not assessed"), never 0.
 *  - Every contribution carries provenance: what / where / when / score /
 *    evidence / source.
 */

const DIMENSIONS = [
  'technical',
  'professional',
  'communication',
  'documentation',
  'reliability',
];

// Evidence kinds, weakest to strongest demonstration of capability.
const KIND_RANK = { none: 0, knowledge: 1, practice: 2, assessment: 2, operational: 3 };

// event type -> evidence kind + which dimensions it informs (weight per dimension).
const EVENT_MAP = {
  module_complete:          { kind: 'knowledge',   dims: { technical: 1 } },
  quiz:                     { kind: 'knowledge',   dims: { technical: 1 } },
  servicenow_itil_exam:     { kind: 'knowledge',   dims: { technical: 1 } },
  mlo_safe_quiz:            { kind: 'knowledge',   dims: { technical: 1 } },
  mock_shift:               { kind: 'practice',    dims: { professional: 1, reliability: 1 } },
  career_training_attempt:  { kind: 'practice',    dims: { technical: 1 } },
  l1_resolution:            { kind: 'operational', dims: { technical: 1, documentation: 1, reliability: 1 } },
  l1_escalation:            { kind: 'operational', dims: { professional: 1, communication: 1, reliability: 1 } },
  // readiness_assessment is handled specially: its meta carries sub-scores.
  readiness_assessment:     { kind: 'assessment',  dims: {} },
};

// readiness_assessment.meta field -> dimension (values are 0-100 percentages).
const ASSESSMENT_META_MAP = {
  workflow:   'reliability',
  compliance: 'professional',
  comm:       'communication',
  adapt:      'professional',
};

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function clampScore(v) {
  return Math.max(0, Math.min(100, v));
}

function sourceOf(ev) {
  const m = ev.meta && typeof ev.meta === 'object' ? ev.meta : {};
  return m.source || m.module || ev.type;
}

function evidenceSummary(ev) {
  const m = ev.meta && typeof ev.meta === 'object' ? ev.meta : {};
  const out = {};
  ['track', 'source', 'module', 'category', 'status', 'recommendation'].forEach(function (k) {
    if (m[k] !== undefined && typeof m[k] !== 'object') out[k] = m[k];
  });
  return out;
}

function contribution(ev, kind, score, weight) {
  return {
    what: ev.type,
    where: sourceOf(ev),
    when: ev.recordedAt || null,
    score: score,
    weight: weight,
    kind: kind,
    evidence: evidenceSummary(ev),
    source: 'candidate-registry:training-events',
  };
}

/** Expand one raw event into per-dimension contributions. */
function contributionsFor(ev) {
  const spec = EVENT_MAP[ev && ev.type];
  if (!spec) return { unmapped: true, byDim: {} };
  if (!isNum(ev.score)) return { unmapped: false, byDim: {}, unscored: true };

  const weight = isNum(ev.weight) && ev.weight > 0 ? ev.weight : 1;
  const byDim = {};

  if (ev.type === 'readiness_assessment') {
    const m = ev.meta && typeof ev.meta === 'object' ? ev.meta : {};
    Object.keys(ASSESSMENT_META_MAP).forEach(function (field) {
      if (isNum(m[field])) {
        const dim = ASSESSMENT_META_MAP[field];
        (byDim[dim] = byDim[dim] || []).push(
          contribution(ev, spec.kind, clampScore(m[field]), weight)
        );
      }
    });
    return { unmapped: false, byDim: byDim };
  }

  Object.keys(spec.dims).forEach(function (dim) {
    byDim[dim] = [contribution(ev, spec.kind, clampScore(ev.score), weight * spec.dims[dim])];
  });
  return { unmapped: false, byDim: byDim };
}

function confidenceFor(items) {
  if (!items.length) return 'none';
  const sources = new Set(items.map(function (i) { return i.where; }));
  if (items.length >= 5 && sources.size >= 2) return 'high';
  if (items.length >= 2) return 'medium';
  return 'low';
}

function strongestKind(items) {
  let best = 'none';
  items.forEach(function (i) {
    if (KIND_RANK[i.kind] > KIND_RANK[best]) best = i.kind;
  });
  return best;
}

function assessDimension(items) {
  if (!items.length) {
    return { score: null, status: 'not_assessed', confidence: 'none', evidenceQuality: 'none', evidenceCount: 0, provenance: [] };
  }
  let total = 0;
  let sum = 0;
  items.forEach(function (i) { total += i.weight; sum += i.score * i.weight; });
  return {
    score: Math.round((sum / total) * 10) / 10,
    status: 'assessed',
    confidence: confidenceFor(items),
    evidenceQuality: strongestKind(items),
    evidenceCount: items.length,
    provenance: items,
  };
}

/**
 * assessProfessionalReadiness(events) -> {
 *   dimensions: { [dimension]: {score, status, confidence, evidenceQuality, evidenceCount, provenance[]} },
 *   overall:    { score|null, coverage, assessedDimensions[], missingDimensions[], confidence },
 *   ignored:    { unmapped: [types], unscored: n },
 *   basis:      string
 * }
 */
function assessProfessionalReadiness(events) {
  const list = Array.isArray(events) ? events : [];
  const perDim = {};
  DIMENSIONS.forEach(function (d) { perDim[d] = []; });
  const unmapped = new Set();
  let unscored = 0;

  list.forEach(function (ev) {
    if (!ev || typeof ev !== 'object') return;
    const c = contributionsFor(ev);
    if (c.unmapped) { unmapped.add(String(ev.type)); return; }
    if (c.unscored) { unscored += 1; return; }
    Object.keys(c.byDim).forEach(function (dim) {
      if (perDim[dim]) perDim[dim] = perDim[dim].concat(c.byDim[dim]);
    });
  });

  const dimensions = {};
  DIMENSIONS.forEach(function (d) { dimensions[d] = assessDimension(perDim[d]); });

  const assessed = DIMENSIONS.filter(function (d) { return dimensions[d].status === 'assessed'; });
  const missing = DIMENSIONS.filter(function (d) { return dimensions[d].status !== 'assessed'; });

  let overallScore = null;
  if (assessed.length) {
    overallScore = Math.round(
      (assessed.reduce(function (s, d) { return s + dimensions[d].score; }, 0) / assessed.length) * 10
    ) / 10;
  }

  // Overall confidence is capped by coverage: a 1-of-5 profile is never "high".
  const coverage = Math.round((assessed.length / DIMENSIONS.length) * 100) / 100;
  const rank = { none: 0, low: 1, medium: 2, high: 3 };
  const names = ['none', 'low', 'medium', 'high'];
  let minRank = assessed.length ? 3 : 0;
  assessed.forEach(function (d) { minRank = Math.min(minRank, rank[dimensions[d].confidence]); });
  if (coverage < 0.6) minRank = Math.min(minRank, 1);
  else if (coverage < 1) minRank = Math.min(minRank, 2);

  return {
    dimensions: dimensions,
    overall: {
      score: overallScore,
      coverage: coverage,
      assessedDimensions: assessed,
      missingDimensions: missing,
      confidence: names[minRank],
    },
    ignored: { unmapped: Array.from(unmapped).sort(), unscored: unscored },
    basis: 'equal-weight-mean-of-assessed-dimensions',
  };
}

module.exports = {
  DIMENSIONS,
  EVENT_MAP,
  ASSESSMENT_META_MAP,
  assessProfessionalReadiness,
};
