const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data/inphusionsys');
const DIVISIONS_DIR = path.join(DATA_DIR, 'divisions');
const TEST_PACK_DIR = path.join(__dirname, '../../test/inphusionsys-pack');

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadDivision(sector) {
  const file = path.join(DIVISIONS_DIR, `${sector}.json`);
  if (!fs.existsSync(file)) return null;
  return loadJson(file);
}

function loadItCatalog() {
  return loadJson(path.join(DATA_DIR, 'shared', 'it-ticket-catalog.json')).scenarios;
}

// GET /api/inphusionsys/divisions
// Lists every InphusionSys division (one per corporate vertical).
router.get('/divisions', (req, res) => {
  const index = loadJson(path.join(DATA_DIR, 'index.json'));
  res.json({ success: true, divisions: index.divisions });
});

// GET /api/inphusionsys/divisions/:sector
// Full detail for one division: employees, business/doc anomalies, IT tickets, routing targets.
router.get('/divisions/:sector', (req, res) => {
  const division = loadDivision(req.params.sector);
  if (!division) {
    return res.status(404).json({ success: false, error: `Unknown division: ${req.params.sector}` });
  }
  res.json({ success: true, division });
});

// GET /api/inphusionsys/scenarios (legacy alias — kept for the 5 original front-end injections)
// Superseded by /divisions/:sector, which covers all 11 verticals. Left in place so existing
// callers (construction.html, legal.html, finops-command-suite-v2.html, hc-denial-war-room.html,
// l1-ticket-copilot.html, pm-strategist.html) don't break during migration.
router.get('/scenarios', (req, res) => {
  const legacySectors = ['construction', 'healthcare', 'finops', 'realestate', 'legal'];
  const scenarios = [];
  legacySectors.forEach(sector => {
    const division = loadDivision(sector);
    if (!division) return;
    division.anomalies.forEach(a => {
      if (!a.file) return; // legacy shape only exposed anomalies backed by a test-pack file
      const assignee = division.employees.find(e => e.id === a.assigneeId);
      scenarios.push({
        id: a.id,
        vertical: division.sector.toUpperCase(),
        title: a.title,
        assignee: assignee ? `${assignee.id} (${assignee.name})` : a.assigneeId,
        file: a.file
      });
    });
  });
  res.json({ success: true, scenarios });
});

// POST /api/inphusionsys/route
// Submit an anomaly or IT ticket for a division and get back where it's routed.
// Body: { sector: "construction", type: "anomaly" | "it", itemId: "SCEN-CN-01" | "IT-CN-01" }
router.post('/route', (req, res) => {
  const { sector, type, itemId } = req.body || {};
  const division = loadDivision(sector);
  if (!division) {
    return res.status(404).json({ success: false, error: `Unknown division: ${sector}` });
  }

  const pool = type === 'it' ? division.itTickets : division.anomalies;
  const item = (pool || []).find(x => x.id === itemId);
  if (!item) {
    return res.status(404).json({ success: false, error: `Unknown ${type} item: ${itemId}` });
  }

  const assignee = division.employees.find(e => e.id === item.assigneeId) || null;
  const auditHash = `AUD-INPH-${Math.floor(100000 + Math.random() * 900000)}`;

  let payloadText = null;
  if (type !== 'it' && item.file) {
    const filePath = path.join(TEST_PACK_DIR, item.file);
    if (fs.existsSync(filePath)) payloadText = fs.readFileSync(filePath, 'utf8');
  }

  let itDefinition = null;
  if (type === 'it') {
    itDefinition = loadItCatalog().find(s => s.id === item.scenarioRef) || null;
  }

  res.json({
    success: true,
    audit_hash: auditHash,
    sector: division.sector,
    type: type === 'it' ? 'it' : 'anomaly',
    item,
    it_definition: itDefinition,
    assignee,
    raw_payload: payloadText,
    routed_to: type === 'it' ? division.itRoute : division.realApp,
    timestamp: new Date().toISOString()
  });
});

// POST /api/inphusionsys/run-live (legacy alias, kept for existing front-end injections)
router.post('/run-live', (req, res) => {
  const { relativePath, vertical } = req.body || {};
  const filePath = path.join(TEST_PACK_DIR, relativePath || '');

  if (!relativePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'Test file not found' });
  }

  const payloadText = fs.readFileSync(filePath, 'utf8');
  const auditHash = `AUD-INPH-${Math.floor(100000 + Math.random() * 900000)}`;

  res.json({
    success: true,
    is_compliant: true,
    audit_hash: auditHash,
    vertical: vertical,
    raw_payload: payloadText,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
