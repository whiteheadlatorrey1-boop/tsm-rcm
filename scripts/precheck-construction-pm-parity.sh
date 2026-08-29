#!/usr/bin/env bash
set -euo pipefail

ROOT="/workspaces/tsm-rcm"
cd "$ROOT"

echo "============================================================"
echo " CONSTRUCTION PM PARITY COMPLETION PRECHECK"
echo "============================================================"

echo
echo "=== 1. GIT STATE ==="
git status --short
git log --oneline -5

echo
echo "=== 2. CONSTRUCTION ADAPTER ==="
sed -n '1,360p' server/construction/construction-control-plane.js

echo
echo "=== 3. PM REFERENCE MODULES ==="
for f in \
  server/pm/action-engine.js \
  server/pm/intelligence-v3.js \
  server/pm/predictive-control.js
do
  echo
  echo "------------------------------------------------------------"
  echo "$f"
  echo "------------------------------------------------------------"
  sed -n '1,360p' "$f"
done

echo
echo "=== 4. SHARED CONTROL-PLANE MODULES ==="
for f in \
  server/vertical-control-plane/production.js \
  server/vertical-control-plane/predictive.js \
  server/vertical-control-plane/explainability.js \
  server/vertical-control-plane/relationships.js
do
  echo
  echo "------------------------------------------------------------"
  echo "$f"
  echo "------------------------------------------------------------"
  sed -n '1,300p' "$f"
done

echo
echo "=== 5. CONSTRUCTION ROUTES ==="
grep -n -B8 -A35 \
  "app.post('/api/construction/intelligence-v3'" \
  server.js || true

echo
echo "=== 6. CONSTRUCTION CONTROL-PLANE REFERENCES ==="
grep -RniE \
  "construction-control-plane|runConstruction|predictive|intelligence-v3|digital.twin|explainability|relationships" \
  server/construction scripts \
  --exclude='*.bak*' \
  --exclude='audit-*.md' \
  --exclude='audit-*.json' \
  2>/dev/null || true

echo
echo "=== 7. PARITY REPORT ==="
if [ -f reports/pm-feature-parity-audit.md ]; then
  grep -A22 -B2 '^ construction' \
    reports/pm-feature-parity-audit.md || true
fi

echo
echo "=== 8. EXISTING TESTS ==="
find scripts -maxdepth 1 -type f \
  \( -iname '*construction*' -o -iname '*pm*' \) \
  -print | sort

echo
echo "============================================================"
echo " PRECHECK COMPLETE"
echo "============================================================"
