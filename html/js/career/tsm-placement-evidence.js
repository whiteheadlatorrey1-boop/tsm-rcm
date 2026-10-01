/* Phase 8F — Placement evidence. Pure, deterministic, unwired.
   Turns a staffing placement's statusHistory into an append-only stream of
   placement-outcome records, kept strictly SEPARATE from training evidence.
   Hard boundary: these records carry no score, no weight, no dimensions and no
   category, use event types that exist nowhere in the 7A EVENT_MAP, and are
   never an input to 7B/7C/8D readiness or competency scoring. Only whitelisted
   fields are copied from the placement, so no protected-class attribute or
   other stray field can ride along. Nothing is inferred: a stage with no
   recorded timestamp is rejected, and no decline reason is invented.
   Does not import any other module. Timestamps come from the placement. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.TSMPlacementEvidence = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '1.0.0';
  var STREAM = 'placement_outcome';

  // Same stage names as 8E / server VALID_STATUSES, prefixed so they can never
  // collide with a 7A training event type.
  var STAGE_TO_EVENT = Object.freeze({
    submitted:    'placement_submitted',
    interviewing: 'placement_interviewing',
    offered:      'placement_offered',
    placed:       'placement_placed',
    declined:     'placement_declined',
    ended:        'placement_ended'
  });
  var EVENT_TYPES = Object.freeze(Object.keys(STAGE_TO_EVENT).map(function (k) { return STAGE_TO_EVENT[k]; }));

  function isStr(x) { return typeof x === 'string' && x.length > 0; }
  function isIso(x) { return isStr(x) && !isNaN(Date.parse(x)); }
  function has(o, k) { return o !== null && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k); }

  // FNV-1a 32-bit. Stable id, NOT cryptographic.
  function fnv(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
    return ('00000000' + h.toString(16)).slice(-8);
  }

  function recordId(placementId, stage, at) {
    return 'pev_' + fnv([placementId, stage, at].join('|'));
  }

  /* placement -> { records, rejected }. Records are frozen, ordered as in the
     history. Only the first-listed 'submitted' entry carries the human-review
     reference (taken from placement.humanReview, never from the history). */
  function buildPlacementEvidence(placement) {
    var records = [];
    var rejected = [];
    if (!placement || typeof placement !== 'object') {
      return Object.freeze({ records: Object.freeze(records), rejected: Object.freeze([{ reason: 'placement-missing' }]) });
    }
    if (!isStr(placement.placementId)) { rejected.push({ reason: 'placement-id-missing' }); }
    if (!isStr(placement.candidateId)) { rejected.push({ reason: 'candidate-id-missing' }); }
    if (rejected.length) {
      return Object.freeze({ records: Object.freeze(records), rejected: Object.freeze(rejected) });
    }

    var history = Array.isArray(placement.statusHistory) ? placement.statusHistory : [];
    var seen = {};
    history.forEach(function (h, i) {
      if (!h || typeof h !== 'object' || !has(STAGE_TO_EVENT, h.status)) { rejected.push({ index: i, reason: 'stage-unknown' }); return; }
      if (!isIso(h.at)) { rejected.push({ index: i, reason: 'timestamp-invalid', stage: h.status }); return; }
      var id = recordId(placement.placementId, h.status, h.at);
      if (seen[id]) { rejected.push({ index: i, reason: 'duplicate-entry', stage: h.status }); return; }
      seen[id] = true;
      var rec = {
        placementEvidenceId: id,
        stream: STREAM,
        eventType: STAGE_TO_EVENT[h.status],
        stage: h.status,
        occurredAt: h.at,
        candidateId: placement.candidateId,
        placementId: placement.placementId,
        jobOrderId: isStr(placement.jobOrderId) ? placement.jobOrderId : null,
        employerId: isStr(placement.employerId) ? placement.employerId : null,
        actorId: isStr(h.actorId) ? h.actorId : null,
        humanReview: null
      };
      if (h.status === 'submitted' && placement.humanReview && typeof placement.humanReview === 'object') {
        var r = placement.humanReview;
        rec.humanReview = Object.freeze({
          reviewerId: isStr(r.reviewerId) ? r.reviewerId : null,
          reviewedAt: isStr(r.reviewedAt) ? r.reviewedAt : null,
          reviewedFingerprint: isStr(r.reviewedFingerprint) ? r.reviewedFingerprint : null
        });
      }
      records.push(Object.freeze(rec));
    });

    return Object.freeze({ records: Object.freeze(records), rejected: Object.freeze(rejected) });
  }

  function isPlacementEvidence(rec) {
    return !!rec && typeof rec === 'object' && rec.stream === STREAM && has(STAGE_TO_EVENT, rec.stage);
  }

  /* Counts only. No rates, no scores, no inference about why anything happened. */
  function summarizePlacementEvidence(records) {
    var byStage = {};
    Object.keys(STAGE_TO_EVENT).forEach(function (s) { byStage[s] = 0; });
    var candidates = {};
    var total = 0;
    (Array.isArray(records) ? records : []).forEach(function (r) {
      if (!isPlacementEvidence(r)) { return; }
      byStage[r.stage] += 1;
      candidates[r.candidateId] = true;
      total += 1;
    });
    return Object.freeze({
      version: VERSION,
      stream: STREAM,
      total: total,
      candidateCount: Object.keys(candidates).length,
      byStage: Object.freeze(byStage)
    });
  }

  return {
    VERSION: VERSION,
    STREAM: STREAM,
    STAGE_TO_EVENT: STAGE_TO_EVENT,
    EVENT_TYPES: EVENT_TYPES,
    buildPlacementEvidence: buildPlacementEvidence,
    isPlacementEvidence: isPlacementEvidence,
    summarizePlacementEvidence: summarizePlacementEvidence
  };
}));
