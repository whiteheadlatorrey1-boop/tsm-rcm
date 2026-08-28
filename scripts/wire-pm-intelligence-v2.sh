#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "============================================================"
echo " TSM PM — WIRE INTELLIGENCE V2"
echo " Digital Twin + Risk + Forecast → Live Portal"
echo "============================================================"

python3 - <<'PY'
from pathlib import Path

p = Path("server.js")
s = p.read_text()

imports = """const { buildPortfolioTwin } = require('./server/pm/portfolio-intelligence');
const { calculateRisk } = require('./server/pm/risk-engine');
const { forecast } = require('./server/pm/forecast-engine');
"""

anchor = "const { buildDecisionPackage } = require('./server/pm/decision-engine');"

if "portfolio-intelligence" not in s:
    if anchor not in s:
        raise SystemExit("ERROR: decision-engine import anchor not found")
    s = s.replace(anchor, anchor + "\n" + imports, 1)

route_anchor = "/* ── PM EXECUTIVE DECISION ENGINE ─────────────────────────────────────────── */"

routes = r"""
/* ── PM INTELLIGENCE V2 ───────────────────────────────────────────────────── */

/**
 * Build one canonical PM intelligence snapshot.
 *
 * The snapshot intentionally feeds the same normalized payload into:
 *   1. Portfolio Digital Twin
 *   2. Risk Engine
 *   3. Forecast Engine
 *
 * No LLM is required for these calculations.
 */
function buildPmIntelligenceSnapshot(payload) {
  const input = payload || {};
  const twin = buildPortfolioTwin(input);
  const risk = calculateRisk(twin, input);
  const projection = forecast(input, twin, risk);

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    engine: 'pm-intelligence-v2',
    twin,
    risk,
    forecast: projection,
    governance: {
      mode: 'DETERMINISTIC',
      llmRequired: false,
      humanApprovalRequired: true,
      writeBackToSourceSystems: false
    }
  };
}

app.post('/api/pm/portfolio-intelligence', (req, res) => {
  try {
    res.json(buildPmIntelligenceSnapshot(req.body || {}));
  } catch (err) {
    console.error('[PM Portfolio Intelligence]', err);
    res.status(500).json({
      ok: false,
      error: 'PM portfolio intelligence generation failed'
    });
  }
});

app.post('/api/pm/risk', (req, res) => {
  try {
    const payload = req.body || {};
    const twin = buildPortfolioTwin(payload);
    res.json({
      ok: true,
      engine: 'pm-risk-engine-v2',
      risk: calculateRisk(twin, payload)
    });
  } catch (err) {
    console.error('[PM Risk Engine]', err);
    res.status(500).json({
      ok: false,
      error: 'PM risk generation failed'
    });
  }
});

app.post('/api/pm/forecast', (req, res) => {
  try {
    const payload = req.body || {};
    const twin = buildPortfolioTwin(payload);
    const risk = calculateRisk(twin, payload);

    res.json({
      ok: true,
      engine: 'pm-forecast-engine-v2',
      forecast: forecast(payload, twin, risk)
    });
  } catch (err) {
    console.error('[PM Forecast Engine]', err);
    res.status(500).json({
      ok: false,
      error: 'PM forecast generation failed'
    });
  }
});

/* ── END PM INTELLIGENCE V2 ───────────────────────────────────────────────── */
"""

if "app.post('/api/pm/portfolio-intelligence'" not in s:
    if route_anchor not in s:
        raise SystemExit("ERROR: PM decision route anchor not found")
    s = s.replace(route_anchor, routes + "\n" + route_anchor, 1)

p.write_text(s)
print("Patched server.js")
PY

echo
echo "=== SERVER SYNTAX ==="
node --check server.js

echo
echo "=== PM MODULE SYNTAX ==="
node --check server/pm/portfolio-intelligence.js
node --check server/pm/risk-engine.js
node --check server/pm/forecast-engine.js

echo
echo "=== V2 UNIT TEST ==="
NODE_PATH="$PWD/node_modules" node scripts/test-pm-intelligence-v2.js

echo
echo "=== ROUTES ==="
grep -n -B3 -A8 \
  "app.post('/api/pm/portfolio-intelligence'" \
  server.js

echo
echo "============================================================"
echo " PM INTELLIGENCE V2 WIRING: PASS"
echo "============================================================"
