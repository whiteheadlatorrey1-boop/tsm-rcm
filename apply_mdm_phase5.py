#!/usr/bin/env python3
"""
Assert-guarded apply-script for the MDM Phase 5 recommendation engine.
Run from the repo root. Uses unique anchor-string matching (not line/context
diffing) so it's resilient to branch drift. Each edit asserts its anchor is
found exactly once before touching the file; if an anchor doesn't match,
the script stops with a clear error instead of silently corrupting a file.

Usage:  python3 apply_mdm_phase5.py
Then:   node --check server.js && node --check html/mdm-suite/mdm-core.js
"""
import re
import sys

def load(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def save(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def apply_edit(path, old, new, label):
    content = load(path)
    count = content.count(old)
    assert count == 1, (
        f"[{label}] expected exactly 1 match in {path}, found {count}.\n"
        f"Anchor snippet (first 120 chars):\n{old[:120]!r}\n"
        f"This file has likely drifted from what this script expects — "
        f"paste the current relevant section back so the anchor can be updated."
    )
    save(path, content.replace(old, new, 1))
    print(f"OK  [{label}] {path}")


# ─────────────────────────────────────────────────────────────────────────
# 1. mdm-core.js — add the recommendation engine
# ─────────────────────────────────────────────────────────────────────────
CORE_PATH = 'html/mdm-suite/mdm-core.js'

CORE_OLD = "module.exports = { findDuplicates, scoreDataset, scoreRecord, recordSimilarity, similarity };"

CORE_NEW = '''// ---------------------------------------------------------------------------
// Phase 5 — Recommendation engine. Deterministic, no LLM call: every
// recommendation traces to a real duplicate match plus the quality score of
// both candidate records, and (when a mergeLog is supplied) to real past
// decisions for the same domain/matchReason pair. This is the "explain why"
// data the strategist UI and /api/mdm/recommendations route consume.
// ---------------------------------------------------------------------------

function recIdFor(domain, match) {
  return `REC-${domain}-${match.recordA.id}-${match.recordB.id}`;
}

// Counts prior APPROVED/REJECTED decisions in the same domain that used the
// same matchReason (identifier_exact vs fuzzy_name) — this is the real
// "resolved N times before" signal, computed from the actual decision log
// rather than invented.
function historicalPatternFor(domain, matchReason, mergeLog) {
  const log = Array.isArray(mergeLog) ? mergeLog : [];
  const priorApproved = log.filter(h =>
    h.domain === domain &&
    h.decision === 'APPROVED' &&
    (h.matchReason ? h.matchReason === matchReason : true)
  );
  const priorRejected = log.filter(h =>
    h.domain === domain &&
    h.decision === 'REJECTED' &&
    (h.matchReason ? h.matchReason === matchReason : true)
  );
  return {
    approvedCount: priorApproved.length,
    rejectedCount: priorRejected.length,
    lastDecisionAt: priorApproved.length ? priorApproved[priorApproved.length - 1].ts : null
  };
}

// Risk = how much is exposed if this duplicate is left unresolved. Combines
// how bad the worse-scoring record's quality is with how confident the match
// itself is. 0-100, higher = more urgent.
function riskFor(match, records) {
  const a = records.find(r => r.id === match.recordA.id) || {};
  const b = records.find(r => r.id === match.recordB.id) || {};
  const worstQuality = Math.min(
    a.quality != null ? a.quality : 100,
    b.quality != null ? b.quality : 100
  );
  const qualityRisk = 100 - worstQuality;
  const matchRisk = match.matchScore;
  return Math.round(qualityRisk * 0.4 + matchRisk * 0.6);
}

function buildRecommendations(records, duplicateMatches, domain, mergeLog) {
  return duplicateMatches.map(m => {
    const pattern = historicalPatternFor(domain, m.matchReason, mergeLog);
    const risk = riskFor(m, records);
    const requiresApproval = !(m.matchReason === 'identifier_exact' && m.matchScore >= 95);
    return {
      id: recIdFor(domain, m),
      domain,
      issue: `Duplicate ${domain} identities: ${m.recordA.id} \\u2194 ${m.recordB.id}`,
      risk,
      action: 'MERGE_RECORDS',
      confidence: m.matchScore,
      requiresApproval,
      survivorId: m.recordA.id,
      mergedId: m.recordB.id,
      matchReason: m.matchReason,
      matchField: m.matchField || null,
      historicalPattern: pattern
    };
  }).sort((x, y) => y.risk - x.risk);
}

module.exports = {
  findDuplicates, scoreDataset, scoreRecord, recordSimilarity, similarity,
  buildRecommendations, recIdFor, historicalPatternFor, riskFor
};'''

apply_edit(CORE_PATH, CORE_OLD, CORE_NEW, 'core-recommendations')


# ─────────────────────────────────────────────────────────────────────────
# 2. server.js — import buildRecommendations, refactor merge into shared
#    executeMdmDecision(), add /recommendations + /recommend/:id routes
# ─────────────────────────────────────────────────────────────────────────
SERVER_PATH = 'server.js'

S1_OLD = "const { findDuplicates: mdmFindDuplicates, scoreDataset: mdmScoreDataset } = require('./html/mdm-suite/mdm-core.js');"
S1_NEW = '''const {
  findDuplicates: mdmFindDuplicates, scoreDataset: mdmScoreDataset,
  buildRecommendations: mdmBuildRecommendations
} = require('./html/mdm-suite/mdm-core.js');'''
apply_edit(SERVER_PATH, S1_OLD, S1_NEW, 'server-import')

S2_OLD = '''app.post('/api/mdm/merge', requireApiKey, (req, res) => {
  const { domain, survivorId, mergedId, actor, decision } = req.body || {};
  if (!domain || !survivorId || !mergedId) {
    return res.status(400).json({ ok: false, error: 'domain, survivorId, mergedId required' });
  }
  const raw = MDM_SEED_DATA[domain];
  if (!raw) return res.status(404).json({ ok: false, error: 'Unknown domain' });
  const survivor = raw.find(r => r.id === survivorId);
  const merged = raw.find(r => r.id === mergedId);
  if (!survivor || !merged) return res.status(404).json({ ok: false, error: 'Record not found in domain' });

  const entry = {
    id: `MRG-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    domain, survivorId, mergedId,
    survivorName: survivor.name, mergedName: merged.name,
    decision: decision === 'REJECTED' ? 'REJECTED' : 'APPROVED',
    actor: actor || 'Unassigned',
    ts: new Date().toISOString()
  };
  MDM_MERGE_LOG.push(entry);

  // Approved merge actually retires the losing record from the working dataset —
  // this is what makes it a real golden-record operation, not just a log entry.
  if (entry.decision === 'APPROVED') {
    MDM_SEED_DATA[domain] = raw.filter(r => r.id !== mergedId);
  }

  res.json({ ok: true, entry });
});

app.get('/api/mdm/merge-history', (req, res) => {
  res.json({ ok: true, log: MDM_MERGE_LOG.slice(-200).reverse() });
});'''

S2_NEW = '''// Shared decision-execution path — used by both the manual /merge endpoint
// (war room / strategist side-by-side review) and the /recommend/:id
// approve|reject endpoints (Phase 5 AI recommendation queue). One code path
// means one place that actually retires a losing record, so the two entry
// points can never drift into different behavior.
function executeMdmDecision({ domain, survivorId, mergedId, actor, decision, extra }) {
  if (!domain || !survivorId || !mergedId) {
    return { error: { status: 400, body: { ok: false, error: 'domain, survivorId, mergedId required' } } };
  }
  const raw = MDM_SEED_DATA[domain];
  if (!raw) return { error: { status: 404, body: { ok: false, error: 'Unknown domain' } } };
  const survivor = raw.find(r => r.id === survivorId);
  const merged = raw.find(r => r.id === mergedId);
  if (!survivor || !merged) return { error: { status: 404, body: { ok: false, error: 'Record not found in domain' } } };

  const entry = {
    id: `MRG-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    domain, survivorId, mergedId,
    survivorName: survivor.name, mergedName: merged.name,
    decision: decision === 'REJECTED' ? 'REJECTED' : 'APPROVED',
    actor: actor || 'Unassigned',
    ts: new Date().toISOString(),
    ...(extra || {})
  };
  MDM_MERGE_LOG.push(entry);

  // Approved merge actually retires the losing record from the working dataset —
  // this is what makes it a real golden-record operation, not just a log entry.
  if (entry.decision === 'APPROVED') {
    MDM_SEED_DATA[domain] = raw.filter(r => r.id !== mergedId);
  }

  return { entry };
}

app.post('/api/mdm/merge', requireApiKey, (req, res) => {
  const { domain, survivorId, mergedId, actor, decision, matchScore, matchReason, matchField, source } = req.body || {};
  const result = executeMdmDecision({
    domain, survivorId, mergedId, actor, decision,
    extra: { matchScore, matchReason, matchField, source: source || 'war-room' }
  });
  if (result.error) return res.status(result.error.status).json(result.error.body);
  res.json({ ok: true, entry: result.entry });
});

app.get('/api/mdm/merge-history', (req, res) => {
  res.json({ ok: true, log: MDM_MERGE_LOG.slice(-200).reverse() });
});

// ── Phase 5: AI Recommendation Queue ────────────────────────────────────────
// Deterministic recommendations derived from the same duplicate-detection
// engine the war room already uses, plus real historical-pattern data pulled
// from MDM_MERGE_LOG. No fabricated stewardship state, no separate "decision
// engine" data source to drift out of sync with /api/mdm/detail.
app.get('/api/mdm/recommendations', (req, res) => {
  const domains = Object.keys(MDM_SEED_DATA);
  let recommendations = [];
  domains.forEach(d => {
    const raw = MDM_SEED_DATA[d];
    const scored = mdmScoreDataset(raw, d);
    const dupes = mdmFindDuplicates(raw, d);
    const recordsWithQuality = raw.map(r => ({
      ...r,
      quality: (scored.scores.find(s => s.recordId === r.id) || {}).overall ?? 0
    }));
    recommendations = recommendations.concat(
      mdmBuildRecommendations(recordsWithQuality, dupes, d, MDM_MERGE_LOG)
    );
  });
  recommendations.sort((a, b) => b.risk - a.risk);
  res.json({ ok: true, recommendations });
});

function findRecommendationById(id) {
  const domains = Object.keys(MDM_SEED_DATA);
  for (const d of domains) {
    const raw = MDM_SEED_DATA[d];
    const dupes = mdmFindDuplicates(raw, d);
    const recs = mdmBuildRecommendations(raw, dupes, d, MDM_MERGE_LOG);
    const hit = recs.find(r => r.id === id);
    if (hit) return hit;
  }
  return null;
}

function recommendDecision(decision) {
  return (req, res) => {
    const rec = findRecommendationById(req.params.id);
    if (!rec) return res.status(404).json({ ok: false, error: 'Unknown or already-resolved recommendation id' });
    const { actor } = req.body || {};
    const result = executeMdmDecision({
      domain: rec.domain, survivorId: rec.survivorId, mergedId: rec.mergedId,
      actor, decision,
      extra: { matchScore: rec.confidence, matchReason: rec.matchReason, matchField: rec.matchField, source: 'ai-recommendation', recommendationId: rec.id }
    });
    if (result.error) return res.status(result.error.status).json(result.error.body);
    res.json({ ok: true, entry: result.entry, recommendation: rec });
  };
}

app.post('/api/mdm/recommend/:id/approve', requireApiKey, recommendDecision('APPROVED'));
app.post('/api/mdm/recommend/:id/reject', requireApiKey, recommendDecision('REJECTED'));'''

apply_edit(SERVER_PATH, S2_OLD, S2_NEW, 'server-routes')


print("\nAll edits applied successfully.")
print("NOTE: this script only touched server.js and html/mdm-suite/mdm-core.js.")
print("The three MDM HTML files (war-room/strategist/executive-portal) were NOT")
print("included here — your branch's copies of those didn't match the anchors")
print("this script expects, so run the follow-up step to get those updated safely.")