/* Phase 8D — Competency scoring from 7B evidence records. Pure, deterministic, unwired.
   Input: the `records` array produced by 7B normalizeEvidence (passed as data).
   Tags come from a server-side event-type map, NEVER from client-supplied meta.
   Only event types with an honest taxonomy mapping are tagged; the rest are
   reported as untagged with a reason. Scores are weighted means of scored,
   tagged evidence on a 0-1 scale. Unscored evidence is never read as zero.
   Verification is never upgraded: only an explicit 'verified' becomes true. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.TSMCompetencyEvidenceScorer = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '1.0.0';
  var TAG_MAP_VERSION = '1.0.0-provisional';

  // PROVISIONAL. Event type -> 8A taxonomy competencyId. Review before relying on it.
  var DEFAULT_TAG_MAP = Object.freeze({
    servicenow_itil_exam: 'it.servicenow.fundamentals',
    l1_resolution: 'it.l1.ticket-triage',
    l1_escalation: 'it.l1.ticket-triage'
  });

  // 7A server dimension names -> 7C projection names (from 7C's own alias table).
  // 'professional' has no 7C counterpart.
  var DIMENSION_NAME_MAP_7A_TO_7C = Object.freeze({
    technical: 'technicalCompetency',
    professional: null,
    communication: 'communication',
    documentation: 'documentation',
    reliability: 'professionalReliability'
  });

  function has(o, k) { return o !== null && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k); }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function round4(n) { return Math.round(n * 10000) / 10000; }

  function scoreCompetencies(records, opts) {
    var custom = !!(opts && opts.map && typeof opts.map === 'object');
    var map = custom ? opts.map : DEFAULT_TAG_MAP;
    var mapVersion = custom ? ((opts && opts.mapVersion) || 'custom') : TAG_MAP_VERSION;
    var valid = opts && Array.isArray(opts.validCompetencyIds) ? opts.validCompetencyIds : null;
    var list = Array.isArray(records) ? records : [];

    var sums = {};
    var evidence = [];
    var untagged = [];
    var scoredCount = 0;

    list.forEach(function (rec) {
      if (!rec || typeof rec !== 'object' || typeof rec.evidenceId !== 'string' || !rec.evidenceId) {
        untagged.push(Object.freeze({ evidenceId: null, type: null, reason: 'malformed_record' }));
        return;
      }
      var type = typeof rec.type === 'string' ? rec.type : null;
      var ref = type !== null && has(map, type) ? map[type] : null;
      if (typeof ref !== 'string' || !ref) {
        untagged.push(Object.freeze({ evidenceId: rec.evidenceId, type: type, reason: 'no_competency_mapping' }));
        return;
      }
      if (valid && valid.indexOf(ref) === -1) {
        untagged.push(Object.freeze({ evidenceId: rec.evidenceId, type: type, reason: 'unknown_competency' }));
        return;
      }
      evidence.push(Object.freeze({
        evidenceId: rec.evidenceId,
        kind: typeof rec.kind === 'string' && rec.kind ? rec.kind : null,
        competencyRef: ref,
        verified: rec.verification === 'verified' ? true : null,
        source: typeof rec.category === 'string' && rec.category ? rec.category : null
      }));
      if (rec.scored === true && isNum(rec.score) && rec.score >= 0 && rec.score <= 100) {
        var w = isNum(rec.weight) && rec.weight > 0 ? rec.weight : 1;
        var s = has(sums, ref) ? sums[ref] : (sums[ref] = { ws: 0, w: 0 });
        s.ws += rec.score * w;
        s.w += w;
        scoredCount += 1;
      }
    });

    var competencies = {};
    Object.keys(sums).sort().forEach(function (k) {
      competencies[k] = round4(sums[k].ws / sums[k].w / 100);
    });

    return Object.freeze({
      scorerVersion: VERSION,
      tagMapVersion: mapVersion,
      competencies: Object.freeze(competencies),
      evidence: Object.freeze(evidence),
      untagged: Object.freeze(untagged),
      basis: Object.freeze({
        recordCount: list.length,
        taggedCount: evidence.length,
        untaggedCount: untagged.length,
        scoredCount: scoredCount,
        competencyCount: Object.keys(competencies).length
      })
    });
  }

  return {
    VERSION: VERSION,
    TAG_MAP_VERSION: TAG_MAP_VERSION,
    DEFAULT_TAG_MAP: DEFAULT_TAG_MAP,
    DIMENSION_NAME_MAP_7A_TO_7C: DIMENSION_NAME_MAP_7A_TO_7C,
    scoreCompetencies: scoreCompetencies
  };
}));
