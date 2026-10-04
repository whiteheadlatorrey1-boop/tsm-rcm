'use strict';
// Turns WORK_NOTE_WRITTEN audit records + human reviews into readiness-gate evidence.
// NEW CODE. Accepts BOTH shapes:
//  - builder shape:  { action: { technician, sourceIncident }, executionResult }
//  - stored shape:   { technician, sourceIncident, executionResult }  (what audit-store keeps)
// Rules:
//  - only identitySource 'staffId' counts toward a worker (others are "unattributed")
//  - only successful writes with an incident id count
//  - a sample gets a score only if a review matches (incident + technician)
//  - reviews need a finite 0-100 score and a reviewerId different from the technician
//  - note length is never used for scoring
// reviews: [{ incidentId, technicianId, score, reviewerId }]
const SKILL_ID = 'work-notes';

function validReview(r) {
  return !!r && Number.isFinite(r.score) && r.score >= 0 && r.score <= 100 &&
    !!r.reviewerId && String(r.reviewerId) !== String(r.technicianId);
}

function normalize(e) {
  if (!e || typeof e !== 'object') return null;
  const a = e.action && typeof e.action === 'object' ? e.action : null;
  const incident = e.sourceIncident !== undefined ? e.sourceIncident : (a ? a.sourceIncident : undefined);
  return {
    eventType: e.eventType,
    technician: e.technician || (a && a.technician) || null,
    incident: incident === undefined || incident === null ? null : String(incident),
    success: !!(e.executionResult && e.executionResult.success === true),
  };
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
  evs.forEach((raw) => {
    const e = normalize(raw);
    if (!e || e.eventType !== 'WORK_NOTE_WRITTEN' || !e.success || e.incident === null) { ignored++; return; }
    const t = e.technician;
    if (!t || t.identitySource !== 'staffId' || !t.id) { unattributed++; return; }
    const w = workers[t.id] || (workers[t.id] = { evidence: [], pendingReview: 0, totalWrites: 0 });
    w.totalWrites++;
    const r = reviewMap.get(key(e.incident, t.id));
    if (r) w.evidence.push({ skillId: SKILL_ID, score: r.score, reviewed: true });
    else w.pendingReview++;
  });
  return { workers, unattributed, ignored };
}

// store: anything with listAudit(filters), e.g. require('../l1-copilot/audit-store')
function buildWorkNoteEvidenceFromStore(store, reviews) {
  const events = store.listAudit({ eventType: 'WORK_NOTE_WRITTEN' });
  return buildWorkNoteEvidence(events, reviews);
}

module.exports = { buildWorkNoteEvidence, buildWorkNoteEvidenceFromStore, SKILL_ID };
