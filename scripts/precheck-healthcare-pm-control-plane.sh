#!/usr/bin/env bash
set -euo pipefail

ROOT="/workspaces/tsm-rcm"
cd "$ROOT"

echo "============================================================"
echo " HEALTHCARE PM CONTROL-PLANE PRECHECK"
echo "============================================================"

echo
echo "=== 1. GIT STATE ==="
git branch --show-current
git log -1 --oneline
git status --short

echo
echo "=== 2. HEALTHCARE SERVER FILES ==="
find server/healthcare -maxdepth 2 -type f -print | sort

echo
echo "=== 3. HEALTHCARE PM/INTELLIGENCE SIGNALS ==="
grep -RniE \
  "portfolio-intelligence|intelligence-v3|decision-engine|risk|forecast|predictive|approval|persistence|audit|telemetry|verification|writeback|relationship" \
  server/healthcare \
  2>/dev/null | head -n 250 || true

echo
echo "=== 4. HEALTHCARE ROUTES ==="
grep -nE \
  "api/(healthcare|hc|pm)/|healthcare.*intelligence|intelligence-v3" \
  server.js \
  2>/dev/null | head -n 200 || true

echo
echo "=== 5. EXISTING HEALTHCARE TESTS ==="
find scripts -maxdepth 1 -type f -print | \
  grep -Ei \
  'healthcare|health|hc-|vertical-control|intelligence|decision' | \
  sort || true

echo
echo "=== 6. SHARED CONTROL-PLANE ==="
ls -1 server/vertical-control-plane

echo
echo "=== 7. EXISTING ADAPTERS ==="
find server/vertical-control-plane/adapters -maxdepth 2 -type f -print \
  2>/dev/null | sort || true

echo
echo "=== 8. PM REFERENCE CONTRACT ==="
grep -nE \
  "portfolio_intelligence|digital_twin|deterministic|risk|forecast|executive_decisions|predictive_control|intelligence_v3|actions|approval|lifecycle|verification|persistence|audit|telemetry|explainability|relationships|writeback" \
  reports/pm-feature-parity-audit.md \
  2>/dev/null || true

echo
echo "=== 9. CONSTRUCTION REFERENCE ==="
if [ -f server/construction/construction-control-plane.js ]; then
  echo "Construction adapter: PRESENT"
  grep -nE \
    "runProductionControlPlane|actionType|result\.decision|result\.action|actions|predictions|actor" \
    server/construction/construction-control-plane.js || true
else
  echo "Construction adapter: MISSING"
fi

echo
echo "=== 10. REAL ESTATE REFERENCE ==="
if [ -f server/real-estate/real-estate-control-plane.js ]; then
  echo "Real Estate adapter: PRESENT"
  grep -nE \
    "runProductionControlPlane|actionType|result\.decision|result\.action|actions|predictions|actor" \
    server/real-estate/real-estate-control-plane.js || true
else
  echo "Real Estate adapter: MISSING"
fi

echo
echo "============================================================"
echo " HEALTHCARE PRECHECK COMPLETE"
echo "============================================================"
