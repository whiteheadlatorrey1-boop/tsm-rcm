'use strict';
// Candidate Registry API — shared backend for both the Career Training
// Platform and the Staffing Readiness Assessment. Single source of truth:
// both frontends read/write here instead of keeping their own local state.
//
// Honesty pattern: candidates default isSampleData:true until a real intake
// pipeline writes candidateId records with isSampleData:false. Readiness
// scores are never typed in directly — they're computed server-side from
// recorded training events (see server/candidate-registry-service.js).

const express = require('express');
const { requireRole } = require('../middleware/require-auth');
const { requireCandidateWrite, signCandidateToken } = require('../middleware/candidate-token');
const router = express.Router();

// Any internal TSM staff session (not an external 'client' portal session,
// and not a candidate's own write token) -- same role set as
// routes/l1-servicenow-drafts.js's `staff` gate.
const requireStaff = requireRole(['admin', 'manager', 'analyst']);

const registry = require('../server/candidate-registry-service');
const { listCsaCandidateEvidence } = require('../server/certification/candidate-evidence-adapter');

const { verifySession, getCookie } = require('../middleware/require-auth');
const isAdmin = req => {
  const sess = verifySession(getCookie(req, 'tsm_session'));
  return !!(sess && sess.role === 'admin');
};
// Non-admins never receive email or Mongo _id.
const publicView = ({ email, _id, ...rest } = {}) => rest;

router.get('/api/candidates', requireStaff, async (req, res) => {
  try {
    const { status } = req.query;
    const candidates = await registry.listCandidates({ status });
    res.json({ candidates: isAdmin(req) ? candidates : candidates.map(publicView) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Read-only certification evidence overview — html/workforce/certification-dashboard.html.
// Cross-references each candidate's server-computed readinessScore (training
// events, any track) against the ServiceNow-CSA evidence ledger (filesystem,
// see server/certification/candidate-evidence-ledger.js — the only
// certification track with an independent evidence ledger today). A nonzero
// score with zero ledger entries is flagged: it has no evidence backing it
// in that ledger, which is exactly the "reconcile readiness scoring with
// evidence" gap this endpoint exists to surface, not paper over.
// Registered before /api/candidates/:id so "evidence-overview" is never
// swallowed as a candidateId by that route.
router.get('/api/candidates/evidence-overview', requireStaff, async (req, res) => {
  try {
    const candidates = await registry.listCandidates({});
    const overview = candidates.map((c) => {
      let csaEvidence = [];
      let evidenceError = null;
      try {
        csaEvidence = listCsaCandidateEvidence(c.candidateId);
      } catch (e) {
        evidenceError = e.message;
      }
      const scoreUnbacked = c.readinessScore > 0 && csaEvidence.length === 0;
      return {
        candidateId: c.candidateId,
        name: c.name,
        role: c.role,
        status: c.status,
        isSampleData: c.isSampleData,
        readinessScore: c.readinessScore,
        readinessBasis: c.readinessBasis,
        csaEvidenceCount: csaEvidence.length,
        csaEvidence,
        evidenceError,
        scoreUnbacked,
      };
    });
    res.json({ ok: true, candidates: overview });
  } catch (err) {
    // Most commonly: MONGODB_URI not configured (registry.listCandidates
    // throws with that exact message) — surfaced verbatim so the dashboard
    // can label it, not swallowed into a generic failure.
    res.status(503).json({ ok: false, error: err.message, candidates: [] });
  }
});

router.get('/api/candidates/:id', requireStaff, async (req, res) => {
  try {
    const candidate = await registry.getCandidate(req.params.id);
    if (!candidate) return res.status(404).json({ error: 'not found' });
    res.json({ candidate: isAdmin(req) ? candidate : publicView(candidate) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/candidates', requireCandidateWrite, async (req, res) => {
  try {
    const candidate = await registry.upsertCandidate(req.body || {}, { trusted: isAdmin(req) });
    res.status(201).json({ candidate, candidateToken: signCandidateToken(candidate.candidateId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/api/candidates/:id', requireCandidateWrite, async (req, res) => {
  try {
    const candidate = await registry.upsertCandidate({
      ...req.body,
      candidateId: req.params.id,
    }, { trusted: isAdmin(req) });
    res.json({ candidate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/candidates/:id/training-events', requireCandidateWrite, async (req, res) => {
  try {
    const candidate = await registry.recordTrainingEvent(req.params.id, req.body || {});
    res.status(201).json({ candidate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/api/candidates/:id', requireRole(['admin']), async (req, res) => {
  try {
    const deleted = await registry.deleteCandidate(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'not found' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dev/demo convenience — seeds clearly-labeled placeholder candidates.
// Admin-only: requires an admin session (delete and seed are not used by learner pages).
router.post('/api/candidates/_seed-sample-data', requireRole(['admin']), async (req, res) => {
  try {
    const candidates = await registry.seedSampleData();
    res.json({ seeded: candidates.length, candidates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
