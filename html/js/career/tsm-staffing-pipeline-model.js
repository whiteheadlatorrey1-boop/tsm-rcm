/* Phase 8E — Staffing pipeline state model. Pure, deterministic, unwired.
   Defines the legal stage transitions for a placement and the human-review gate
   that must pass before a candidate is submitted. Stage names are EXACTLY the
   statuses already used by server/staffing-engine-service.js (VALID_STATUSES).
   No I/O, no clock, no randomness, no ranking, no decisions. Timestamps and
   actor ids are supplied by the caller. Does not import any other module.
   Placement/stage data is NOT training evidence (see 8F). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.TSMStaffingPipelineModel = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MODEL_VERSION = '1.0.0';

  var STAGES = Object.freeze(['submitted', 'interviewing', 'offered', 'placed', 'declined', 'ended']);

  var TRANSITIONS = Object.freeze({
    submitted:    Object.freeze(['interviewing', 'declined', 'ended']),
    interviewing: Object.freeze(['offered', 'declined', 'ended']),
    offered:      Object.freeze(['placed', 'declined', 'ended']),
    placed:       Object.freeze(['ended']),
    declined:     Object.freeze([]),
    ended:        Object.freeze([])
  });

  function isStr(x) { return typeof x === 'string' && x.length > 0; }
  function isIso(x) { return isStr(x) && !isNaN(Date.parse(x)); }
  function has(o, k) { return o !== null && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k); }

  function isTerminal(stage) { return has(TRANSITIONS, stage) && TRANSITIONS[stage].length === 0; }

  function canTransition(from, to) {
    return has(TRANSITIONS, from) && TRANSITIONS[from].indexOf(to) !== -1;
  }

  function nextStages(from) { return has(TRANSITIONS, from) ? TRANSITIONS[from].slice() : []; }

  /* Gate that must pass before a placement is created (stage 'submitted').
     matchResult = 8B/8B-2 output; review = a human reviewer's recorded decision.
     Returns { allowed, reasons[] }. Never decides on the candidate's behalf. */
  function evaluateSubmissionGate(matchResult, review) {
    var reasons = [];
    var m = matchResult || {};
    var r = review || {};

    if (!matchResult || typeof matchResult !== 'object') { reasons.push('match-result-missing'); }
    else {
      if (!m.review || m.review.humanReviewRequired !== true || m.review.automatedDecision !== false) {
        reasons.push('match-not-flagged-for-human-review');
      }
      if (!m.audit || !isStr(m.audit.inputFingerprint)) { reasons.push('match-audit-missing'); }
    }

    if (!review || typeof review !== 'object') { reasons.push('human-review-missing'); }
    else {
      if (r.decision !== 'approved') { reasons.push('review-not-approved'); }
      if (!isStr(r.reviewerId)) { reasons.push('reviewer-id-missing'); }
      if (!isIso(r.reviewedAt)) { reasons.push('reviewed-at-invalid'); }
      if (m.audit && isStr(m.audit.inputFingerprint) && r.reviewedFingerprint !== m.audit.inputFingerprint) {
        reasons.push('review-does-not-match-current-match');
      }
      if (isStr(r.candidateId) && m.candidateId && r.candidateId !== m.candidateId) { reasons.push('review-candidate-mismatch'); }
      if (isStr(r.jobId) && m.jobId && r.jobId !== m.jobId) { reasons.push('review-job-mismatch'); }
    }

    return Object.freeze({ allowed: reasons.length === 0, reasons: Object.freeze(reasons) });
  }

  /* Validates a stage change without applying it. */
  function validateTransition(placement, to, ctx) {
    var reasons = [];
    var c = ctx || {};
    if (!placement || typeof placement !== 'object') { reasons.push('placement-missing'); return Object.freeze({ ok: false, reasons: Object.freeze(reasons) }); }
    if (STAGES.indexOf(placement.status) === -1) { reasons.push('current-stage-invalid'); }
    if (STAGES.indexOf(to) === -1) { reasons.push('target-stage-invalid'); }
    if (reasons.length === 0 && !canTransition(placement.status, to)) {
      reasons.push(isTerminal(placement.status) ? 'current-stage-terminal' : 'transition-not-allowed');
    }
    if (!isStr(c.actorId)) { reasons.push('actor-id-missing'); }
    if (!isIso(c.at)) { reasons.push('timestamp-invalid'); }
    return Object.freeze({ ok: reasons.length === 0, reasons: Object.freeze(reasons) });
  }

  /* Returns a NEW placement with the stage applied and the history extended.
     Never mutates the input. Throws if the transition is not valid. */
  function applyTransition(placement, to, ctx) {
    var v = validateTransition(placement, to, ctx);
    if (!v.ok) { throw new Error('Invalid transition: ' + v.reasons.join(', ')); }
    var history = Array.isArray(placement.statusHistory) ? placement.statusHistory.slice() : [];
    history.push({ status: to, at: ctx.at, actorId: ctx.actorId });
    var next = {};
    Object.keys(placement).forEach(function (k) { next[k] = placement[k]; });
    next.status = to;
    next.statusHistory = history;
    next.updatedAt = ctx.at;
    if (to === 'placed') { next.placedAt = ctx.at; }
    return next;
  }

  return {
    MODEL_VERSION: MODEL_VERSION,
    STAGES: STAGES,
    TRANSITIONS: TRANSITIONS,
    isTerminal: isTerminal,
    canTransition: canTransition,
    nextStages: nextStages,
    evaluateSubmissionGate: evaluateSubmissionGate,
    validateTransition: validateTransition,
    applyTransition: applyTransition
  };
}));
