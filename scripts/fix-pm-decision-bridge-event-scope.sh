#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BRIDGE="html/war-rooms/pm-copilot/services/pm-decision-bridge.js"
BACKUP="${BRIDGE}.event-scope.bak"

echo "============================================================"
echo " TSM PM DECISION BRIDGE — EVENT SCOPE HARDENING"
echo "============================================================"

if [[ ! -f "$BRIDGE" ]]; then
  echo "ERROR: bridge not found: $BRIDGE"
  exit 1
fi

echo
echo "=== BACKUP ==="
if [[ ! -f "$BACKUP" ]]; then
  cp "$BRIDGE" "$BACKUP"
  echo "Created: $BACKUP"
else
  echo "Backup already exists: $BACKUP"
fi

python3 - "$BRIDGE" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()

old = """    window.addEventListener('TSM_RELAY_EVENT', function (event) {
      const payload = event.detail || event.payload;
      if (payload) run(payload);
    });"""

new = """    window.addEventListener('TSM_RELAY_EVENT', function (event) {
      // TSM_RELAY_EVENT is a shared cross-vertical event bus.
      // The PM Executive Decision Engine may consume it ONLY when
      // the relay explicitly identifies itself as the PM domain.
      const detail = event && event.detail;
      if (!detail || detail.domain !== 'PM') return;

      const payload = detail.payload;
      if (payload && typeof payload === 'object') {
        run(payload);
      }
    });"""

if old not in text:
    print("ERROR: expected unscoped TSM_RELAY_EVENT handler not found.")
    sys.exit(1)

text = text.replace(old, new, 1)
path.write_text(text)

print(f"Patched: {path}")
PY

echo
echo "=== NODE SYNTAX ==="
node --check "$BRIDGE"
echo "PASS: bridge syntax"

node --check server/pm/decision-engine.js
echo "PASS: decision engine syntax"

node --check server.js
echo "PASS: server syntax"

echo
echo "=== EVENT HANDLER ==="
grep -n -A18 -B3 \
  "TSM_RELAY_EVENT" \
  "$BRIDGE"

echo
echo "=== SENTINEL KEY CHECK ==="
if grep -nE \
  "sessionStorage\.(getItem|setItem).*TSM_PM_STRATEGIST_RELAY|localStorage\.(getItem|setItem).*TSM_PM_STRATEGIST_RELAY" \
  "$BRIDGE"
then
  echo "ERROR: bridge has executable Sentinel relay access."
  exit 1
else
  echo "PASS: no executable Sentinel relay access."
fi

echo
echo "=== BROAD DISCOVERY CHECK ==="
if grep -nE \
  "pm\.\*relay|relay\.\*pm|pm\.\*war" \
  "$BRIDGE"
then
  echo "ERROR: broad PM relay discovery remains."
  exit 1
else
  echo "PASS: no broad PM relay discovery."
fi

echo
echo "=== CANONICAL STORAGE CHECK ==="
grep -n \
  "TSM_PM_RELAY" \
  "$BRIDGE"

echo
echo "=== PM DECISION ENGINE TEST ==="
node scripts/test-pm-decision-engine.js

echo
echo "=== DIFF CHECK ==="
git diff --check -- "$BRIDGE" || {
  echo "ERROR: bridge diff check failed."
  exit 1
}

echo
echo "=== FINAL STATUS ==="
git status --short -- "$BRIDGE"

echo
echo "============================================================"
echo " PM DECISION BRIDGE EVENT SCOPE HARDENED"
echo "============================================================"
echo
echo "Contract:"
echo "  Storage: TSM_PM_RELAY only"
echo "  Event:   TSM_RELAY_EVENT where detail.domain === 'PM'"
echo "  Sentinel: TSM_PM_STRATEGIST_RELAY NEVER consumed"
echo "  Discovery: no arbitrary PM relay keys"
