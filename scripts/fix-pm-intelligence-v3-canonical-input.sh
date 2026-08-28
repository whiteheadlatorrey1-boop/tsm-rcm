#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FILE="server.js"

echo "============================================================"
echo " TSM PM — V3 CANONICAL DECISION WIRING"
echo " findings[] → V1 → V3"
echo "============================================================"

cp "$FILE" "$FILE.bak-before-pm-v3-canonical"

python3 - <<'PY'
from pathlib import Path

p = Path("server.js")
s = p.read_text()

old = """app.post('/api/pm/intelligence-v3', (req, res) => {
  try {
    res.json(buildPmIntelligenceV3(req.body || {}));
  } catch (err) {
"""

new = """app.post('/api/pm/intelligence-v3', (req, res) => {
  try {
    const payload = req.body || {};

    // Canonical PM intelligence path:
    // findings[] → deterministic PM Decision Engine → V3 action/verification layer.
    //
    // If the caller already provides a canonical decision package, preserve it.
    // Otherwise normalize raw PM findings through V1 before V3 consumes them.
    const hasCanonicalDecisions =
      Array.isArray(payload.decisions) &&
      payload.decisions.length > 0;

    const decisionPackage = hasCanonicalDecisions
      ? payload
      : buildDecisionPackage(payload);

    res.json(buildPmIntelligenceV3(decisionPackage));
  } catch (err) {
"""

if old not in s:
    raise SystemExit("ERROR: V3 route marker not found; no changes made.")

s = s.replace(old, new, 1)
p.write_text(s)

print("Patched server.js")
PY

echo
echo "=== SERVER SYNTAX ==="
node --check server.js

echo
echo "=== V3 MODULE SYNTAX ==="
node --check server/pm/intelligence-v3.js

echo
echo "=== DECISION ENGINE SYNTAX ==="
node --check server/pm/decision-engine.js

echo
echo "=== ROUTE ==="
grep -n -B5 -A25 \
  "app.post('/api/pm/intelligence-v3'" \
  server.js

echo
echo "============================================================"
echo " PM V3 CANONICAL WIRING: PATCH COMPLETE"
echo "============================================================"
