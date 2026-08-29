#!/usr/bin/env bash
set -euo pipefail

ROOT="/workspaces/tsm-rcm"
cd "$ROOT"

ADAPTER="server/real-estate/real-estate-control-plane.js"
TEST="scripts/test-real-estate-control-plane.js"

echo "============================================================"
echo " REAL ESTATE CONTROL-PLANE V2 FIX + VALIDATION"
echo "============================================================"

echo
echo "=== 1. CURRENT FAILING ASSERTION ==="
sed -n '245,275p' "$TEST"

echo
echo "=== 2. CURRENT ADAPTER RETURN PATH ==="
sed -n '165,215p' "$ADAPTER"

echo
echo "=== 3. PATCH ADAPTER COMPATIBILITY ==="

python3 - <<'PY'
from pathlib import Path

p = Path("server/real-estate/real-estate-control-plane.js")
s = p.read_text()

old = """  return runProductionControlPlane({
    ...domain,

    actionType,

    actionPayload:
      input.actionPayload || {},

    predictions,

    actor:
      input.actor ||
      'real-estate-control-plane'
  });
"""

new = """  const result = runProductionControlPlane({
    ...domain,

    actionType,

    actionPayload:
      input.actionPayload || {},

    predictions,

    actor:
      input.actor ||
      'real-estate-control-plane'
  });

  /*
   * PM-facing compatibility aliases.
   *
   * The canonical Vertical Control Plane remains:
   *   decisions[]
   *   actions[]
   *
   * The Real Estate adapter additionally exposes singular
   * decision/action objects for PM consumers that expect them.
   */
  if (!result.decision && Array.isArray(result.decisions)) {
    result.decision = result.decisions[0] || null;
  }

  if (!result.action && Array.isArray(result.actions)) {
    result.action = result.actions[0] || null;
  }

  return result;
"""

if old not in s:
    if "result.action = result.actions[0]" in s:
        print("Action compatibility alias already present.")
    else:
        raise SystemExit(
            "ERROR: Expected adapter return block was not found. "
            "No changes made."
        )
else:
    p.write_text(s.replace(old, new))
    print("Real Estate adapter patched.")

PY

echo
echo "=== 4. VERIFY PATCH ==="
sed -n '165,225p' "$ADAPTER"

echo
echo "=== 5. SYNTAX CHECKS ==="

node --check "$ADAPTER"
echo "PASS: real-estate-control-plane.js"

node --check server/real-estate/real-estate-engine.js
echo "PASS: real-estate-engine.js"

node --check server/vertical-control-plane/production.js
echo "PASS: vertical-control-plane/production.js"

node --check server.js
echo "PASS: server.js"

echo
echo "=== 6. RUN REAL ESTATE TEST ==="

node "$TEST"

echo
echo "=== 7. RUN VERTICAL CONTROL-PLANE RUNTIME TEST ==="

if [ -f scripts/test-vertical-control-plane-runtime.js ]; then
  node scripts/test-vertical-control-plane-runtime.js
else
  echo "SKIP: vertical control-plane runtime test not present"
fi

echo
echo "=== 8. GIT DIFF ==="
git diff -- \
  "$ADAPTER" \
  "$TEST"

echo
echo "============================================================"
echo " REAL ESTATE CONTROL-PLANE V2 VALIDATION COMPLETE"
echo "============================================================"
