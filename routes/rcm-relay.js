// routes/rcm-relay.js
//
// Server-side staging for the FinOps Doc Showcase → TSM RCM OS relay.
//
// Showcase fires all 4 engines on a document, then POSTs the result here.
// RCM OS polls/GETs on load to pick up the latest staged analysis and route
// each piece (triage, variance, action plan, executive) to the module that
// owns handling it. This is a thin staging layer, not a database — swap the
// in-memory store below for your persistence layer of choice (Mongo,
// Postgres, Redis, etc.) when ready; the route contract stays the same.
//
// Mount in server.js:
//   const rcmRelayRouter = require('./routes/rcm-relay');
//   app.use('/api/rcm', rcmRelayRouter);
//
// Endpoints:
//   POST   /api/rcm/relay        — showcase pushes a new analysis payload
//   GET    /api/rcm/relay        — rcm-os fetches the latest staged payload
//   GET    /api/rcm/relay/:id    — fetch a specific staged payload by id
//   GET    /api/rcm/relay/history — list of recent staged payloads (metadata only)
//   DELETE /api/rcm/relay        — clear the current staged payload

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// ── In-memory staging store ────────────────────────────────────────────────
// Swap for a real store when ready. Keeps the last N relays so RCM OS can
// show intake history, not just the single latest handoff.
const MAX_HISTORY = 25;
let relayHistory = []; // newest first
let current = null;    // pointer to the latest staged relay

function stageId() {
  return crypto.randomBytes(6).toString('hex');
}

function summarize(entry) {
  return {
    id: entry.id,
    docName: entry.docName,
    generatedAt: entry.generatedAt,
    receivedAt: entry.receivedAt,
    hasTriage: !!(entry.engines && entry.engines.triage),
    hasVariance: !!(entry.engines && entry.engines.variance),
    hasActionPlan: !!(entry.engines && entry.engines.actionPlan),
    hasExecutive: !!(entry.engines && entry.engines.executive)
  };
}

// ── POST /api/rcm/relay ─────────────────────────────────────────────────────
// Body: { docName, generatedAt, engines: { triage, variance, actionPlan, executive } }
router.post('/relay', express.json({ limit: '2mb' }), (req, res) => {
  const body = req.body || {};

  if (!body.docName || !body.engines) {
    return res.status(400).json({
      error: { message: 'Payload must include docName and an engines object.' }
    });
  }

  const entry = {
    id: stageId(),
    docName: String(body.docName).slice(0, 200),
    generatedAt: body.generatedAt || new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    engines: {
      triage: (body.engines.triage || '').slice(0, 20000),
      variance: (body.engines.variance || '').slice(0, 20000),
      actionPlan: (body.engines.actionPlan || '').slice(0, 20000),
      executive: (body.engines.executive || '').slice(0, 20000)
    }
  };

  relayHistory.unshift(entry);
  if (relayHistory.length > MAX_HISTORY) relayHistory = relayHistory.slice(0, MAX_HISTORY);
  current = entry;

  res.json({ ok: true, id: entry.id, receivedAt: entry.receivedAt });
});

// ── GET /api/rcm/relay ───────────────────────────────────────────────────────
// Returns the latest staged relay, or 204 if nothing has been staged yet.
router.get('/relay', (req, res) => {
  if (!current) return res.status(204).end();
  res.json(current);
});

// ── GET /api/rcm/relay/history ──────────────────────────────────────────────
// Metadata only — for an intake history list in the UI.
router.get('/relay/history', (req, res) => {
  res.json({ items: relayHistory.map(summarize) });
});

// ── GET /api/rcm/relay/:id ───────────────────────────────────────────────────
router.get('/relay/:id', (req, res) => {
  const entry = relayHistory.find(e => e.id === req.params.id);
  if (!entry) return res.status(404).json({ error: { message: 'Not found.' } });
  res.json(entry);
});

// ── DELETE /api/rcm/relay ────────────────────────────────────────────────────
// Clears the "current" pointer (used by the RCM OS "Clear intake" button).
// History is left intact so past intakes are still browsable.
router.delete('/relay', (req, res) => {
  current = null;
  res.json({ ok: true });
});

module.exports = router;