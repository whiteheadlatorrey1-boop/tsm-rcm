#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "============================================================"
echo " TSM PM — INTELLIGENCE V4 BUILD"
echo " Predictive Portfolio Control"
echo " Observe → Understand → Predict → Decide → Execute → Verify"
echo "============================================================"

MODULE="server/pm/predictive-control.js"
ROUTE_FILE="server.js"

cat > "$MODULE" <<'JS'
'use strict';

/**
 * TSM PM Predictive Portfolio Control v1
 *
 * Purpose:
 *   Convert deterministic PM decisions into forward-looking management
 *   signals without pretending to have live source-system writeback.
 *
 * Design:
 *   V1 Decision Engine = what is known now
 *   V3 Intelligence    = what action should be governed
 *   V4 Predictive      = what is likely to happen next
 *
 * No LLM is required for the predictive calculation.
 */

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function text(value, fallback = '') {
  return value === undefined || value === null
    ? fallback
    : String(value).trim();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function probabilityFrom(action) {
  const priority = text(action.priority).toUpperCase();
  const exposure = num(action.exposure);

  let probability = 0.20;

  if (priority === 'CRITICAL') probability += 0.35;
  else if (priority === 'HIGH') probability += 0.20;
  else if (priority === 'MEDIUM') probability += 0.10;

  if (exposure >= 25000) probability += 0.15;
  else if (exposure >= 5000) probability += 0.08;

  if (text(action.urgency).toLowerCase() === 'immediate') {
    probability += 0.10;
  }

  return clamp(Number(probability.toFixed(2)), 0.05, 0.95);
}

function classifyHorizon(probability) {
  if (probability >= 0.75) return '0-7 DAYS';
  if (probability >= 0.55) return '7-30 DAYS';
  return '30-90 DAYS';
}

function buildPrediction(action) {
  const probability = probabilityFrom(action);
  const exposure = num(action.exposure);

  const expectedExposure = Math.round(exposure * probability);

  let signal = 'WATCH';
  if (probability >= 0.75) signal = 'LIKELY';
  else if (probability >= 0.55) signal = 'ELEVATED';

  return {
    actionId: action.id,
    decisionId: action.decisionId,
    entityId: action.entityId,
    domain: action.domain,
    signal,
    probability,
    horizon: classifyHorizon(probability),
    currentExposure: exposure,
    expectedExposure,
    rationale:
      `Based on current priority, urgency, and modeled exposure, ` +
      `the condition has a ${Math.round(probability * 100)}% modeled likelihood ` +
      `of requiring continued management attention.`,
    deterministic: true
  };
}

function buildPmPredictiveControl(intelligence) {
  const actions = Array.isArray(intelligence && intelligence.actions)
    ? intelligence.actions
    : [];

  const predictions = actions
    .filter(action => text(action.status, 'OPEN').toUpperCase() !== 'VERIFIED')
    .map(buildPrediction);

  const predictedExposure = predictions.reduce(
    (sum, item) => sum + num(item.expectedExposure),
    0
  );

  const likely = predictions.filter(
    item => item.signal === 'LIKELY'
  ).length;

  const elevated = predictions.filter(
    item => item.signal === 'ELEVATED'
  ).length;

  return {
    ok: true,
    engine: 'pm-predictive-control-v1',
    generatedAt: new Date().toISOString(),

    predictionSummary: {
      total: predictions.length,
      likely,
      elevated,
      watch: predictions.length - likely - elevated,
      predictedExposure
    },

    predictions,

    controlRecommendations: predictions
      .filter(item => item.signal !== 'WATCH')
      .sort((a, b) => b.expectedExposure - a.expectedExposure)
      .map(item => ({
        actionId: item.actionId,
        entityId: item.entityId,
        priority:
          item.signal === 'LIKELY' ? 'IMMEDIATE ATTENTION' : 'MANAGEMENT REVIEW',
        recommendation:
          item.signal === 'LIKELY'
            ? `Act now on ${item.entityId} to reduce the probability of continued exposure.`
            : `Review ${item.entityId} and establish a mitigation plan before exposure increases.`,
        expectedExposure: item.expectedExposure,
        horizon: item.horizon
      })),

    governance: {
      mode: 'DETERMINISTIC',
      llmRequired: false,
      humanApprovalRequired: true,
      sourceSystemWriteback: false,
      predictiveValuesAreModeled: true
    }
  };
}

module.exports = {
  buildPmPredictiveControl,
  buildPrediction
};
JS

echo "Created $MODULE"

echo
echo "=== PATCH SERVER ==="

python3 - <<'PY'
from pathlib import Path

p = Path("server.js")
s = p.read_text()

import_line = "const { buildPmPredictiveControl } = require('./server/pm/predictive-control');"

if import_line not in s:
    marker = "const { buildDecisionPackage } = require('./server/pm/decision-engine');"
    if marker not in s:
        raise SystemExit("Could not locate decision-engine import")
    s = s.replace(marker, marker + "\n" + import_line, 1)

route_marker = "app.post('/api/pm/intelligence-v3'"

if "app.post('/api/pm/predictive-control'" not in s:
    route = r"""
/* ── PM PREDICTIVE PORTFOLIO CONTROL ─────────────────────────────────────── */
app.post('/api/pm/predictive-control', (req, res) => {
  try {
    res.json(buildPmPredictiveControl(req.body || {}));
  } catch (err) {
    console.error('[PM Predictive Portfolio Control]', err);
    res.status(500).json({
      ok: false,
      error: 'PM predictive portfolio control generation failed'
    });
  }
});
/* ── END PM PREDICTIVE PORTFOLIO CONTROL ──────────────────────────────────── */

"""
    if route_marker not in s:
        raise SystemExit("Could not locate V3 route")
    s = s.replace(route_marker, route + route_marker, 1)

p.write_text(s)
PY

echo "Patched server.js"

echo
echo "=== SYNTAX ==="
node --check "$MODULE"
node --check server.js

echo
echo "=== V4 UNIT TEST ==="

node - <<'NODE'
const {
  buildPmPredictiveControl
} = require('./server/pm/predictive-control');

const fixture = {
  actions: [
    {
      id: 'ACT-PM-DEC-001',
      decisionId: 'PM-DEC-001',
      entityId: 'S-211',
      domain: 'iot',
      priority: 'CRITICAL',
      exposure: 3000,
      urgency: 'Immediate',
      status: 'OPEN'
    },
    {
      id: 'ACT-PM-DEC-002',
      decisionId: 'PM-DEC-002',
      entityId: 'V-03',
      domain: 'vendor_compliance',
      priority: 'HIGH',
      exposure: 25000,
      urgency: 'Today',
      status: 'OPEN'
    },
    {
      id: 'ACT-PM-DEC-003',
      decisionId: 'PM-DEC-003',
      entityId: 'WO-2201',
      domain: 'maintenance',
      priority: 'HIGH',
      exposure: 40,
      urgency: 'Today',
      status: 'OPEN'
    }
  ]
};

const result = buildPmPredictiveControl(fixture);

if (!result.ok) throw new Error('V4 result not ok');
if (result.predictions.length !== 3) {
  throw new Error(`Expected 3 predictions, got ${result.predictions.length}`);
}
if (!result.governance.humanApprovalRequired) {
  throw new Error('Human approval must remain required');
}
if (result.governance.sourceSystemWriteback !== false) {
  throw new Error('Source-system writeback must remain disabled');
}
if (!result.predictionSummary.predictedExposure) {
  throw new Error('Expected modeled predicted exposure');
}

console.log('PM Predictive Control v4 test: PASS');
console.log(JSON.stringify({
  engine: result.engine,
  summary: result.predictionSummary,
  topPrediction: result.predictions[0],
  governance: result.governance
}, null, 2));
NODE

echo
echo "=== ROUTE ==="
grep -n -B4 -A18 \
  "app.post('/api/pm/predictive-control'" \
  server.js

echo
echo "============================================================"
echo " PM INTELLIGENCE V4 BUILD: PASS"
echo "============================================================"
