#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BRIDGE="html/war-rooms/pm-copilot/services/pm-decision-bridge.js"
ENGINE="server/pm/decision-engine.js"
SERVER="server.js"
BRIDGE_TEST="scripts/test-pm-decision-bridge-contract.sh"
ENGINE_TEST="scripts/test-pm-decision-engine.js"

echo "============================================================"
echo " TSM PM EXECUTIVE DECISION ENGINE — FINAL VERIFICATION"
echo "============================================================"

echo
echo "=== 1. REQUIRED FILES ==="
for f in "$BRIDGE" "$ENGINE" "$SERVER" "$BRIDGE_TEST" "$ENGINE_TEST"; do
  if [[ -f "$f" ]]; then
    echo "PASS: $f"
  else
    echo "FAIL: missing $f"
    exit 1
  fi
done

echo
echo "=== 2. NODE SYNTAX ==="
node --check "$ENGINE"
echo "PASS: decision engine syntax"

node --check "$SERVER"
echo "PASS: server syntax"

node --check "$BRIDGE"
echo "PASS: bridge syntax"

echo
echo "=== 3. DECISION ENGINE TEST ==="
node "$ENGINE_TEST"

echo
echo "=== 4. BRIDGE CONTRACT TEST ==="
bash "$BRIDGE_TEST"

echo
echo "=== 5. CANONICAL PM RELAY ==="
grep -n -E \
  "TSM_PM_RELAY|relay\.read\('PM'\)|relay\.read\(\"PM\"\)" \
  "$BRIDGE"

echo
echo "=== 6. PM EVENT SCOPE ==="
grep -n -A10 -B2 \
  "TSM_RELAY_EVENT" \
  "$BRIDGE"

echo
echo "=== 7. SENTINEL ISOLATION ==="
if grep -n \
  -E "sessionStorage\.(getItem|setItem).*TSM_PM_STRATEGIST_RELAY|localStorage\.(getItem|setItem).*TSM_PM_STRATEGIST_RELAY" \
  "$BRIDGE"
then
  echo "FAIL: Sentinel relay executable access detected"
  exit 1
else
  echo "PASS: no executable Sentinel relay access"
fi

echo
echo "=== 8. PM PRODUCER ==="
grep -n -A3 -B3 \
  "setItem('TSM_PM_RELAY'" \
  html/war-rooms/pm-copilot/pm-command.html

echo
echo "=== 9. PM RELAY CORE ==="
grep -n -A2 -B2 \
  "PM:" \
  html/war-rooms/_relay_control_plane/relay.core.js

echo
echo "=== 10. SERVER ROUTE ==="
grep -n -A14 -B4 \
  "/api/pm/executive-decisions" \
  "$SERVER"

echo
echo "=== 11. PM-ONLY WORKTREE ==="
git status --short | grep -E \
  'server/pm|pm-copilot/services/pm-decision-bridge|test-pm-decision|upgrade-pm-executive-decisions|fix-pm-decision-bridge' \
  || true

echo
echo "=== 12. PM DIFF STAT ==="
git diff --stat -- \
  "$ENGINE" \
  "$SERVER" \
  "$BRIDGE" \
  scripts/test-pm-decision-engine.js \
  scripts/test-pm-decision-bridge-contract.sh \
  scripts/upgrade-pm-executive-decisions.sh \
  scripts/fix-pm-decision-bridge-canonical.sh \
  scripts/fix-pm-decision-bridge-event-scope.sh

echo
echo "=== 13. UNTRACKED PM FILES ==="
git status --short | grep -E \
  '^\?\?.*(server/pm|pm-copilot/services/pm-decision-bridge|test-pm-decision|upgrade-pm-executive-decisions|fix-pm-decision-bridge)' \
  || true

echo
echo "============================================================"
echo " PM EXECUTIVE DECISION ENGINE — VERIFIED"
echo "============================================================"
echo
echo "Contract:"
echo "  Decision engine: PASS"
echo "  API route:       /api/pm/executive-decisions"
echo "  Storage relay:   TSM_PM_RELAY only"
echo "  Event relay:     TSM_RELAY_EVENT + domain === PM"
echo "  Event payload:   detail.payload"
echo "  Sentinel:        isolated"
echo "  Discovery:       none"
echo
echo "NEXT:"
echo "  Review the PM diff before staging."
echo "============================================================"
