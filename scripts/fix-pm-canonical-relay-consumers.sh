#!/usr/bin/env bash
set -euo pipefail

ROOT="/workspaces/tsm-rcm"

STRATEGIST="$ROOT/html/war-rooms/pm-copilot/pm-strategist.html"
EXEC="$ROOT/html/war-rooms/pm-copilot/pm-exec-portal.html"

echo "=== PM CANONICAL RELAY CONSUMER FIX ==="

for f in "$STRATEGIST" "$EXEC"; do
  test -f "$f" || {
    echo "ERROR: missing $f"
    exit 1
  }
done

cp "$STRATEGIST" "$STRATEGIST.bak"
cp "$EXEC" "$EXEC.bak"

python3 - "$STRATEGIST" "$EXEC" <<'PY'
from pathlib import Path
import sys

files = [Path(p) for p in sys.argv[1:]]

for path in files:
    text = path.read_text()

    old = """const raw = sessionStorage.getItem(RELAY_KEY_FALLBACK) || localStorage.getItem(RELAY_KEY_FALLBACK) || localStorage.getItem('TSM_PM_STRATEGIST_RELAY');"""

    new = """const raw = sessionStorage.getItem(RELAY_KEY_FALLBACK) || localStorage.getItem(RELAY_KEY_FALLBACK) || localStorage.getItem('TSM_PM_RELAY');"""

    if old not in text:
        raise SystemExit(
            f"ERROR: expected relay fallback not found in {path}"
        )

    text = text.replace(old, new, 1)

    old_listener = """if(e.key === RELAY_KEY_FALLBACK || e.key === 'TSM_PM_STRATEGIST_RELAY' || e.key === 'TSM_EVENT_LOG') render();"""

    new_listener = """if(e.key === RELAY_KEY_FALLBACK || e.key === 'TSM_PM_RELAY' || e.key === 'TSM_EVENT_LOG') render();"""

    if old_listener not in text:
        raise SystemExit(
            f"ERROR: expected storage listener not found in {path}"
        )

    text = text.replace(old_listener, new_listener, 1)

    path.write_text(text)

    print(f"UPDATED: {path}")
PY

echo
echo "=== VERIFY CONSUMERS ==="

grep -n -A3 -B2 \
  "localStorage.getItem('TSM_PM_RELAY')" \
  "$STRATEGIST" "$EXEC"

echo
grep -n \
  "e.key === 'TSM_PM_RELAY'" \
  "$STRATEGIST" "$EXEC"

echo
echo "=== VERIFY OLD SENTINEL FALLBACK IS GONE FROM CONSUMERS ==="

if grep -n \
  "localStorage.getItem('TSM_PM_STRATEGIST_RELAY')" \
  "$STRATEGIST" "$EXEC"; then
  echo "ERROR: old Sentinel relay key still used as PM consumer fallback"
  exit 1
fi

if grep -n \
  "e.key === 'TSM_PM_STRATEGIST_RELAY'" \
  "$STRATEGIST" "$EXEC"; then
  echo "ERROR: old Sentinel relay key still used by PM consumer storage listeners"
  exit 1
fi

echo "OK: PM Strategist and Executive Portal now consume canonical TSM_PM_RELAY."

echo
echo "=== VERIFY SENTINEL CHANNEL REMAINS ==="

grep -n \
  "TSM_PM_STRATEGIST_RELAY" \
  "$ROOT/html/sentinel-center.html" \
  "$ROOT/html/war-rooms/pm-copilot/pm-command.html" \
  || {
    echo "ERROR: Sentinel anomaly channel was unexpectedly removed"
    exit 1
  }

echo "OK: TSM_PM_STRATEGIST_RELAY remains available for Sentinel anomaly feed."

echo
echo "=== DIFF ==="

git diff -- \
  html/war-rooms/pm-copilot/pm-strategist.html \
  html/war-rooms/pm-copilot/pm-exec-portal.html

echo
echo "=== COMPLETE ==="
echo "Backups:"
echo "  $STRATEGIST.bak"
echo "  $EXEC.bak"
