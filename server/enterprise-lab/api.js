'use strict';

const express = require('express');
const router = express.Router();
const { engine, CATEGORIES } = require('./incident-engine');

router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'TSM Enterprise Lab' });
});

// List missions in the queue, sorted by SLA urgency.
router.get('/missions', (req, res) => {
  const { status, priority, limit } = req.query;
  const items = engine.list({
    status,
    priority,
    limit: limit ? parseInt(limit, 10) : undefined,
  });
  res.json({ ok: true, count: items.length, missions: items });
});

router.get('/missions/:id', (req, res) => {
  const m = engine.get(req.params.id);
  if (!m) return res.status(404).json({ ok: false, error: 'Mission not found' });
  res.json({ ok: true, mission: m });
});

// Manually inject an incident (Chaos Engine button).
router.post('/incidents/generate', (req, res) => {
  const { category, priority, issue } = req.body || {};
  const mission = engine.createIncident({ category, priority, issue });
  res.json({ ok: true, mission });
});

router.get('/incidents/categories', (req, res) => {
  res.json({ ok: true, categories: CATEGORIES.map(c => c.type) });
});

// Advance a mission through its lifecycle.
router.post('/missions/:id/advance', (req, res) => {
  const { status, ...patch } = req.body || {};
  const m = engine.advance(req.params.id, status, patch);
  if (!m) return res.status(404).json({ ok: false, error: 'Mission not found or invalid status' });
  res.json({ ok: true, mission: m });
});

// Trigger simulated AI analysis on a mission.
router.post('/missions/:id/ai-analyze', (req, res) => {
  const m = engine.aiAnalyze(req.params.id);
  if (!m) return res.status(404).json({ ok: false, error: 'Mission not found' });
  res.json({ ok: true, mission: m });
});

// Sprint benchmark stats (Phase 10).
router.get('/benchmark', (req, res) => {
  res.json({ ok: true, benchmark: engine.benchmark() });
});

router.post('/reset', (req, res) => {
  engine.reset();
  for (let i = 0; i < 8; i++) engine.createIncident();
  res.json({ ok: true });
});

module.exports = router;
