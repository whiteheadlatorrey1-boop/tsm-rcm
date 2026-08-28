#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BRIDGE="html/war-rooms/pm-copilot/services/pm-decision-bridge.js"
BACKUP="${BRIDGE}.bak"

echo "============================================================"
echo " TSM PM DECISION BRIDGE — CANONICAL RELAY FIX"
echo "============================================================"

if [[ ! -f "$BRIDGE" ]]; then
  echo "ERROR: Missing $BRIDGE"
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

echo
echo "=== PATCH CANONICAL RELAY RESOLUTION ==="

python - "$BRIDGE" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
s = path.read_text()

# ------------------------------------------------------------
# Replace findRelayPayload()
# ------------------------------------------------------------

start_marker = "  function findRelayPayload() {"
end_marker = "\n  async function run(payload)"

if start_marker not in s:
    raise SystemExit("ERROR: findRelayPayload() not found.")

start = s.index(start_marker)

if end_marker not in s[start:]:
    raise SystemExit("ERROR: end of findRelayPayload() not found.")

end = s.index(end_marker, start)

new_function = """  function findRelayPayload() {
    // Executive decisions consume ONLY the canonical PM relay.
    //
    // TSM_PM_RELAY is the rich PM War Room payload.
    //
    // The Sentinel anomaly channel is intentionally not consumed here.

    try {
      if (
        window.TSM &&
        window.TSM.relay &&
        typeof window.TSM.relay.read === 'function'
      ) {
        const payload = window.TSM.relay.read('PM');

        if (payload && typeof payload === 'object') {
          return payload;
        }
      }
    } catch (_) {}

    // Explicit fallback: canonical PM relay only.
    try {
      const raw =
        sessionStorage.getItem('TSM_PM_RELAY') ||
        localStorage.getItem('TSM_PM_RELAY');

      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }
"""

s = s[:start] + new_function + s[end:]

# ------------------------------------------------------------
# Replace broad storage listener
# ------------------------------------------------------------

old_listener = """    window.addEventListener('storage', function (event) {
      if (/pm.*relay|relay.*pm|pm.*war/i.test(event.key || '')) {
        try {
          run(JSON.parse(event.newValue));
        } catch (_) {}
      }
    });"""

new_listener = """    window.addEventListener('storage', function (event) {
      // Executive decision engine reacts ONLY to the canonical PM relay.
      if (event.key !== 'TSM_PM_RELAY') return;

      try {
        if (event.newValue) {
          run(JSON.parse(event.newValue));
        }
      } catch (_) {}
    });"""

if old_listener not in s:
    raise SystemExit(
        "ERROR: broad storage listener not found. "
        "Inspect the bridge before making further changes."
    )

s = s.replace(old_listener, new_listener, 1)

path.write_text(s)

print(f"Patched {path}")
PY

echo "PASS: bridge patched."

echo
echo "=== NODE SYNTAX ==="

node --check "$BRIDGE"
echo "PASS: bridge syntax"

node --check server/pm/decision-engine.js
echo "PASS: decision engine syntax"

node --check server.js
echo "PASS: server syntax"

echo
echo "=== CANONICAL EXECUTIVE RELAY ==="

grep -n -A8 -B4 \
  "findRelayPayload" \
  "$BRIDGE"

echo
echo "=== CANONICAL STORAGE LISTENER ==="

grep -n -A10 -B3 \
  "event.key !== 'TSM_PM_RELAY'" \
  "$BRIDGE"

echo
echo "=== EXECUTABLE SENTINEL-KEY CHECK ==="

if grep -n \
  "getItem('TSM_PM_STRATEGIST_RELAY')\|getItem(\"TSM_PM_STRATEGIST_RELAY\")\|setItem('TSM_PM_STRATEGIST_RELAY'\|setItem(\"TSM_PM_STRATEGIST_RELAY\"" \
  "$BRIDGE"; then
  echo
  echo "ERROR: Executive bridge contains an executable Sentinel relay reference."
  exit 1
else
  echo "PASS: Executive bridge does not read/write Sentinel relay."
fi

echo
echo "=== BROAD STORAGE-DISCOVERY CHECK ==="

if grep -nE \
  "pm\\.\\*relay|relay\\.\\*pm|pm\\.\\*war|relay.*pm.*war" \
  "$BRIDGE"; then
  echo
  echo "ERROR: Broad PM relay discovery remains."
  exit 1
else
  echo "PASS: No broad PM relay discovery remains."
fi

echo
echo "=== EXPLICIT PM RELAY ACCESS ==="

grep -n \
  "TSM_PM_RELAY" \
  "$BRIDGE"

echo
echo "=== PM DECISION ENGINE TEST ==="

node scripts/test-pm-decision-engine.js

echo
echo "=== DIFF CHECK ==="

git diff --check

echo
echo "=== BRIDGE DIFF ==="

git diff -- "$BRIDGE"

echo
echo "=== WORKTREE STATUS ==="

git status --short

echo
echo "============================================================"
echo " COMPLETE"
echo "============================================================"
echo
echo "Executive bridge input contract:"
echo
echo "  PRIMARY:"
echo "    window.TSM.relay.read('PM')"
echo
echo "  FALLBACK:"
echo "    sessionStorage.TSM_PM_RELAY"
echo "    localStorage.TSM_PM_RELAY"
echo
echo "  STORAGE EVENT:"
echo "    TSM_PM_RELAY only"
echo
echo "  SENTINEL:"
echo "    TSM_PM_STRATEGIST_RELAY is NOT consumed"
echo
echo "Backup:"
echo "  $BACKUP"
