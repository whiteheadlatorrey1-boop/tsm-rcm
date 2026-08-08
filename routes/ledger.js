'use strict';
const express = require('express');
const router = express.Router();

const ledger = require('../server/tsm-ledger-service');

// GET /api/ledger/health
// Connects (or reuses the cached connection) and confirms read access.
// Returns entry count only — never touches or echoes credentials.
router.get('/api/ledger/health', async (req, res) => {
  try {
    const recent = await ledger.readRecentEntries(1);
    res.json({ ok: true, connected: true, recentCount: recent.length });
  } catch (err) {
    res.status(500).json({ ok: false, connected: false, error: err.message });
  }
});

// GET /api/ledger/recent?limit=20
router.get('/api/ledger/recent', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const entries = await ledger.readRecentEntries(limit);
    res.json({ ok: true, entries });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
