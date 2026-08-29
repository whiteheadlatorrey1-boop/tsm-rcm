#!/usr/bin/env bash
set -euo pipefail

ROOT="/workspaces/tsm-rcm"
cd "$ROOT"

ADAPTER="server/real-estate/real-estate-control-plane.js"
TEST="scripts/test-real-estate-control-plane.js"

echo "============================================================"
echo " REAL ESTATE ACTION CONTRACT FIX"
echo "============================================================"

echo
echo "=== 1. CURRENT ADAPTER CONTRACT ==="
sed -n '175,215p' "$ADAPTER"

echo
echo "=== 2. APPLY ACTION ALIAS ==="

python3 - <<'PY'
from pathlib import Path

p = Path("server/real-estate/real-estate-control-plane.js")
s = p.read_text()

needle = """  result.decision =
    Array.isArray(result.decisions) &&
    result.decisions.length > 0
      ? result.decisions[0]
      : null;

  return result;
"""

replacement = """  result.decision =
    Array.isArray(result.decisions) &&
    result.decisions.length > 0
      ? result.decisions[0]
      : null;

  // PM-facing singular action contract.
  // Preserve canonical actions[] collection while exposing
  // the selected Real Estate action as result.action.
  result.action =
    Array.isArray(result.actions) &&
    result.actions.length > 0
      ? result.actions[0]
      : null;

  return result;
"""

if "result.action =" in s:
    print("Action alias already exists. No change required.")
elif needle in s:
    p.write_text(s.replace(needle, replacement))
    print("Action alias added successfully.")
else:
    raise SystemExit(
        "ERROR: Expected decision compatibility block was not found."
    )
PY

echo
echo "=== 3. VERIFY ADAPTER ==="
sed -n '175,225p' "$ADAPTER"

echo
echo "=== 4. SYNTAX CHECK ==="
node --check "$ADAPTER"
echo "PASS: real-estate-control-plane.js"

echo
echo "=== 5. RUN REAL ESTATE TEST ==="
node "$TEST"

echo
echo "=== 6. RUN VERTICAL CONTROL-PLANE RUNTIME TEST ==="
if [ -f scripts/test-vertical-control-plane-runtime.js ]; then
  node scripts/test-vertical-control-plane-runtime.js
else
  echo "SKIP: scripts/test-vertical-control-plane-runtime.js not found"
fi

echo
echo "=== 7. GIT DIFF ==="
git diff -- "$ADAPTER" "$TEST"

echo
echo "============================================================"
echo " REAL ESTATE ACTION CONTRACT VALIDATION COMPLETE"
echo "============================================================"
