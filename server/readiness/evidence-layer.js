'use strict';

/**
 * Phase 7B - Unified Evidence Layer (pure, unwired).
 *
 * Normalizes Candidate Registry training events into ONE evidence record
 * shape, tagged with a business category. Builds on the 7A registry
 * (EVENT_MAP) rather than duplicating it, so kind + dimension mapping has a
 * single source of truth.
 *
 * Honesty rules:
 *  - Event types with no category mapping are REJECTED with a reason, not guessed.
 *  - Unscored events are kept as records (score null) so gaps stay visible.
 *  - verification is always 'system_recorded' today: events are posted to the
 *    Candidate Registry API and are not independently verified. 'verified' is
 *    reserved for a future server-side verifier (certifications, employer
 *    confirmation) and is never derived from client-supplied meta.
 *  - Categories with no emitting source yet are reported as missing sources.
 */

const crypto = require('crypto');
const { EVENT_MAP } = require('./professional-readiness-model.js');

// The 7B evidence categories, in roadmap order, plus 'assessment' for the
// existing readiness_assessment event, which fits none of the nine.
const CATEGORIES = [
  'training',
  'practice',
  'rcm',
  'interview',
  'it_l1',
  'sap',
  'healthcare',
  'certification',
  'work_project',
  'assessment',
];

// event type -> category (kind + dimensions come from the 7A EVENT_MAP).
const TYPE_CATEGORY = {
  module_complete:         'training',
  quiz:                    'training',
  mlo_safe_quiz:           'training',
  sap_exam:           'training',
  m365_exam:           'training',
  aplus_exam:           'training',
  aplus_practice_session: 'training',
  mock_shift:              'practice',
  career_training_attempt: 'rcm',
  servicenow_itil_exam:    'it_l1',
  l1_resolution:           'it_l1',
  l1_escalation:           'it_l1',
  readiness_assessment:    'assessment',
};

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function evidenceId(candidateId, ev, index) {
  const raw = [candidateId || '', ev.type, ev.recordedAt || '', isNum(ev.score) ? ev.score : '', index].join('|');
  return 'ev_' + crypto.createHash('sha1').update(raw).digest('hex').slice(0, 12);
}

function sourceOf(ev) {
  const m = ev.meta && typeof ev.meta === 'object' ? ev.meta : {};
  return m.source || m.module || ev.type;
}

function summaryOf(ev) {
  const m = ev.meta && typeof ev.meta === 'object' ? ev.meta : {};
  const out = {};
  ['track', 'source', 'module', 'category', 'status', 'recommendation'].forEach(function (k) {
    if (m[k] !== undefined && typeof m[k] !== 'object') out[k] = m[k];
  });
  return out;
}

/**
 * normalizeEvidence(events, { candidateId }) -> { records[], rejected[] }
 */
function normalizeEvidence(events, options) {
  const candidateId = options && options.candidateId ? String(options.candidateId) : null;
  const list = Array.isArray(events) ? events : [];
  const records = [];
  const rejected = [];

  list.forEach(function (ev, index) {
    if (!ev || typeof ev !== 'object' || Array.isArray(ev) || typeof ev.type !== 'string' || !ev.type.trim()) {
      rejected.push({ index: index, type: null, reason: 'malformed_event' });
      return;
    }
    const category = TYPE_CATEGORY[ev.type];
    const spec = EVENT_MAP[ev.type];
    if (!category || !spec) {
      rejected.push({ index: index, type: ev.type, reason: 'unmapped_event_type' });
      return;
    }
    const scored = isNum(ev.score);
    records.push({
      evidenceId: evidenceId(candidateId, ev, index),
      candidateId: candidateId,
      category: category,
      kind: spec.kind,
      type: ev.type,
      source: sourceOf(ev),
      recordedAt: ev.recordedAt || null,
      score: scored ? Math.max(0, Math.min(100, ev.score)) : null,
      scored: scored,
      weight: isNum(ev.weight) && ev.weight > 0 ? ev.weight : 1,
      dimensions: Object.assign({}, spec.dims),
      verification: 'system_recorded',
      summary: summaryOf(ev),
    });
  });

  return { records: records, rejected: rejected };
}

/**
 * summarizeEvidence(records) -> per-category counts and explicit gaps.
 */
function summarizeEvidence(records) {
  const list = Array.isArray(records) ? records : [];
  const byCategory = {};
  CATEGORIES.forEach(function (c) {
    byCategory[c] = { total: 0, scored: 0, latest: null };
  });

  list.forEach(function (r) {
    const slot = byCategory[r.category];
    if (!slot) return;
    slot.total += 1;
    if (r.scored) slot.scored += 1;
    if (r.recordedAt && (!slot.latest || r.recordedAt > slot.latest)) slot.latest = r.recordedAt;
  });

  const emittingCategories = new Set(Object.keys(TYPE_CATEGORY).map(function (t) { return TYPE_CATEGORY[t]; }));

  return {
    total: list.length,
    byCategory: byCategory,
    categoriesWithEvidence: CATEGORIES.filter(function (c) { return byCategory[c].scored > 0; }),
    categoriesWithoutEvidence: CATEGORIES.filter(function (c) { return byCategory[c].scored === 0; }),
    // Categories no event type maps to yet: the platform cannot produce this
    // evidence at all until a source is built (e.g. interview, sap, healthcare).
    categoriesWithoutSource: CATEGORIES.filter(function (c) { return !emittingCategories.has(c); }),
  };
}

module.exports = {
  CATEGORIES,
  TYPE_CATEGORY,
  normalizeEvidence,
  summarizeEvidence,
};
