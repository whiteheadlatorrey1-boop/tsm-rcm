#!/usr/bin/env bash
# verify-all.sh — runs both Mission Control verifiers in sequence.
#
#   1. verify-mission-runtime.js — mission-model.js/mission-store.js
#      directly (vm sandbox, in-memory localStorage shim). No browser,
#      no deps beyond node. Always runs.
#   2. verify-mission-control.js — real Puppeteer DOM test against
#      bpo-internal1.html (intake -> real mission -> kanban -> localStorage
#      round-trip, per sector, screenshots to scripts/screenshots/).
#      Needs `npm install puppeteer` once, and a Chromium binary
#      (blocked in the sandbox that wrote this; works in your Codespace).
#   3. validate-patch.js — structural HTML check on every currently
#      modified .html file (vs HEAD): catches the recurring missing-
#      <script>-include / premature-</body></html> injector bug and dead
#      local script/href targets. No deps beyond node. Always runs. Run
#      `npm run validate-patch:all` separately to scan the whole repo
#      (large pre-existing backlog — not part of this gate).
#
# Usage:
#   scripts/verify-all.sh
#   scripts/verify-all.sh /custom/path/to/bpo-internal1.html
#
# Exit code: 0 only if every check that ran actually passed. If
# Puppeteer/Chromium isn't available, step 2 is skipped (not silently
# passed) and the exit code reflects that.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET="${1:-$REPO_ROOT/html/war-rooms/bpo/bpo-internal1.html}"

overall_status=0

echo "════════════════════════════════════════════════════════════"
echo "  1/3  Mission runtime (mission-model.js / mission-store.js)"
echo "════════════════════════════════════════════════════════════"
if node "$SCRIPT_DIR/verify-mission-runtime.js"; then
  echo "[PASS] verify-mission-runtime.js"
else
  echo "[FAIL] verify-mission-runtime.js"
  overall_status=1
fi

echo
echo "════════════════════════════════════════════════════════════"
echo "  2/3  Mission Control DOM/UI (bpo-internal1.html via Puppeteer)"
echo "════════════════════════════════════════════════════════════"

if [ ! -f "$TARGET" ]; then
  echo "[SKIP] target file not found: $TARGET"
  overall_status=1
elif ! node -e "require.resolve('puppeteer')" 2>/dev/null; then
  echo "[SKIP] puppeteer not installed — run: npm install puppeteer"
  echo "       (Chromium download needs network access this environment may not have;"
  echo "        run this step in your Codespace, not a restricted sandbox.)"
  overall_status=1
else
  if node "$SCRIPT_DIR/verify-mission-control.js" "$TARGET"; then
    echo "[PASS] verify-mission-control.js"
  else
    echo "[FAIL] verify-mission-control.js"
    overall_status=1
  fi
fi

echo
echo "════════════════════════════════════════════════════════════"
echo "  3/3  Patch structural validator (modified .html files vs HEAD)"
echo "════════════════════════════════════════════════════════════"
if node "$SCRIPT_DIR/validate-patch.js"; then
  echo "[PASS] validate-patch.js"
else
  echo "[FAIL] validate-patch.js"
  overall_status=1
fi

echo
if [ "$overall_status" -eq 0 ]; then
  echo "ALL VERIFIERS PASSED"
else
  echo "ONE OR MORE VERIFIERS FAILED OR WERE SKIPPED — see above"
fi

exit "$overall_status"