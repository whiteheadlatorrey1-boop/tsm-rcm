'use strict';
// Turns WORK_NOTE_WRITTEN audit events + human reviews into readiness-gate evidence.
// NEW CODE. Rules:
//  - only events with identitySource 'staffId' count toward a worker (others are "unattributed")
//  - only successful writes count
//  - a sample gets a score only if a review matches (incident + technician)
//  - reviews must have a finite 0-100 score and a reviewerId different from the technician
//  - note length is never used for scoring
// events:  output of buildWorkNoteAuditEvent()
// reviews: [{ incidentId, technicianId, score, reviewerId }]
const SKILL_ID = 'work-notes';

function validReview(r) {
  return !!r && Number.isFinite(r.score) && r.score >= 0 && r.score <= 100 &&
    !!r.reviewerId && String(r.reviewerId) !== String(r.technicianId);
}

function buildWorkNoteEvidence(events, reviews) {
  const evs = Array.isArray(events) ? events : [];
  const revs = (Array.isArray(reviews) ? reviews : []).filter(validReview);
  const key = (inc, tech) => String(inc) + '\u0000' + String(tech);
  const reviewMap = new Map();
  revs.forEach((r) => reviewMap.set(key(r.incidentId, r.technicianId), r));

  const workers = {};
  let unattributed = 0;
  let ignored = 0;
  evs.forEach((e) => {
    if (!e || e.eventType !== 'WORK_NOTE_WRITTEN') { ignored++; return; }
    if (!e.executionResult || e.executionResult.success !== true) { ignored++; return; }
    const t = e.action && e.action.technician;
    if (!t || t.identitySource !== 'staffId') { unattributed++; return; }
    const w = workers[t.id] || (workers[t.id] = { evidence: [], pendingReview: 0, totalWrites: 0 });
    w.totalWrites++;
    const r = reviewMap.get(key(e.action.sourceIncident, t.id));
    if (r) w.evidence.push({ skillId: SKILL_ID, score: r.score, reviewed: true });
    else w.pendingReview++;
  });
  return { workers, unattributed, ignored };
}

module.exports = { buildWorkNoteEvidence, SKILL_ID };
