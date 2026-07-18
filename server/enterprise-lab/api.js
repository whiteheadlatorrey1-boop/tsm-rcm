'use strict';

const express = require('express');
const router = express.Router();
const { engine, CATEGORIES } = require('./incident-engine');
const twinsRouter = require('./twins-router');

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

// Categories that have a matching digital twin get a real twin fault applied
// (feeding SLA/AI Risk/Technician/Historical Analytics) in addition to the
// ticket this route already creates below. VPN and SCADA are intentionally
// left unmapped — no twin models those systems yet.
const CATEGORY_TO_MODULE = {
  'Dell Laptop': 'device',
  'Desktop': 'device',
  'Printer': 'device',
  'Network': 'network',
  'Active Directory': 'ad',
  'Microsoft 365': 'm365',
  'VMware': 'vmware',
};

// Manually inject an incident (Chaos Engine button). Best-effort also
// applies a matching digital-twin fault so SLA/AI Risk/Technician/
// Historical Analytics reflect it, not just the Service Desk Wall.
router.post('/incidents/generate', (req, res) => {
  const { category, priority, issue } = req.body || {};
  const mission = engine.createIncident({ category, priority, issue });

  const moduleName = CATEGORY_TO_MODULE[mission.category];
  if (moduleName) {
    try {
      twinsRouter.triggerModuleFault(moduleName);
    } catch (err) {
      // Best-effort: e.g. no valid target currently exists for any fault
      // type on this twin. The ticket above was already created
      // successfully, so don't fail the request over this.
    }
  }

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
