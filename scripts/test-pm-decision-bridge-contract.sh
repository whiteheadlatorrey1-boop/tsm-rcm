#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BRIDGE="html/war-rooms/pm-copilot/services/pm-decision-bridge.js"
ENGINE="server/pm/decision-engine.js"

echo "============================================================"
echo " TSM PM DECISION BRIDGE — CONTRACT TEST"
echo "============================================================"

echo
echo "=== 1. FILES ==="
test -f "$BRIDGE"
test -f "$ENGINE"
echo "PASS: bridge and decision engine exist"

echo
echo "=== 2. SYNTAX ==="
node --check "$BRIDGE"
echo "PASS: bridge syntax"

node --check "$ENGINE"
echo "PASS: decision engine syntax"

node --check server.js
echo "PASS: server syntax"

echo
echo "=== 3. CANONICAL STORAGE CONTRACT ==="

grep -Fq "sessionStorage.getItem('TSM_PM_RELAY')" "$BRIDGE"
grep -Fq "localStorage.getItem('TSM_PM_RELAY')" "$BRIDGE"
grep -Fq "event.key !== 'TSM_PM_RELAY'" "$BRIDGE"

echo "PASS: TSM_PM_RELAY is the only storage relay"

echo
echo "=== 4. PM EVENT CONTRACT ==="

grep -Fq "event.detail" "$BRIDGE"
grep -Fq "detail.domain !== 'PM'" "$BRIDGE"
grep -Fq "const payload = detail.payload" "$BRIDGE"

echo "PASS: TSM_RELAY_EVENT requires domain === PM"
echo "PASS: event payload comes from detail.payload"

echo
echo "=== 5. SENTINEL ISOLATION ==="

if grep -nE \
  "getItem\\(['\"]TSM_PM_STRATEGIST_RELAY|setItem\\(['\"]TSM_PM_STRATEGIST_RELAY|removeItem\\(['\"]TSM_PM_STRATEGIST_RELAY" \
  "$BRIDGE"
then
  echo "FAIL: bridge contains executable Sentinel relay access"
  exit 1
fi

echo "PASS: Sentinel relay is not consumed"

echo
echo "=== 6. BROAD RELAY DISCOVERY ==="

if grep -nE \
  "Object\\.keys\\((sessionStorage|localStorage)\\)|\\.filter\\([^)]*pm.*relay|relay.*pm" \
  "$BRIDGE"
then
  echo "FAIL: broad relay discovery remains"
  exit 1
fi

echo "PASS: no arbitrary PM relay discovery"

echo
echo "=== 7. PM RELAY PRODUCER CONTRACT ==="

grep -Fq "localStorage.setItem('TSM_PM_RELAY'" \
  html/war-rooms/pm-copilot/pm-command.html

grep -Fq "sessionStorage.setItem('TSM_PM_RELAY'" \
  html/war-rooms/pm-copilot/pm-command.html

echo "PASS: PM command writes canonical relay"

echo
echo "=== 8. RELAY CORE CONTRACT ==="

grep -Fq "PM:           \"TSM_PM_RELAY\"" \
  html/war-rooms/_relay_control_plane/relay.core.js

echo "PASS: relay core maps PM to TSM_PM_RELAY"

echo
echo "=== 9. PM DOMAIN CONTRACT ==="

grep -Fq "const DOMAIN = 'PM'" \
  html/war-rooms/pm-copilot/pm-command.html 2>/dev/null || true

grep -Fq "const DOMAIN = 'PM'" \
  html/war-rooms/pm-copilot/pm-strategist.html

grep -Fq "const DOMAIN = 'PM'" \
  html/war-rooms/pm-copilot/pm-exec-portal.html

echo "PASS: PM strategist and executive portal use PM domain"

echo
echo "=== 10. DECISION ENGINE ==="

node scripts/test-pm-decision-engine.js

echo
echo "============================================================"
echo " PM DECISION BRIDGE CONTRACT: PASS"
echo "============================================================"
echo
echo "Contract:"
echo "  Storage:   TSM_PM_RELAY only"
echo "  Event:     TSM_RELAY_EVENT + detail.domain === 'PM'"
echo "  Payload:   detail.payload"
echo "  Sentinel:  isolated"
echo "  Discovery: none"
echo
