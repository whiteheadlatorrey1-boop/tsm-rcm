#!/usr/bin/env bash
# fix-healthcare-script-bugs.sh
#
# Fixes two real bugs surfaced by tests/e2e/tsm-platform.spec.js once its
# path corrections let it actually reach these pages (previously it never
# got this far — the old paths 404'd before these bugs could even show up).
#
# Bug 1 — html/healthcare/hc-denial-war-room.html:
#   <script src="./html/js/tsm-runtime-lock.js"> is a RELATIVE path. Since
#   the page itself lives at /html/healthcare/hc-denial-war-room.html, that
#   resolves to /html/healthcare/html/js/tsm-runtime-lock.js — a doubled
#   "html/" segment that 404s. The real file only exists at
#   /html/js/tsm-runtime-lock.js (confirmed single location on disk, and
#   the exact absolute path war-room-prep.html already references
#   correctly). Fix: use the absolute path.
#
# Bug 2 — html/healthcare/hc-main-strategist.html:
#   Loads /js/core/tsm-kernel-upgrade.js, whose first line is
#   `const bus = window.TSMEventBus; if (!bus) { console.error(...); return; }`
#   — but this page never loads /js/core/tsm-event-bus.js at all, so the
#   guard always fires and the kernel-upgrade patch (BNCA engine, replay
#   engine, event logging) silently never installs on this page. Confirmed
#   against the working pattern in bpo-strategist-v2.html, which loads
#   tsm-event-bus.js well before tsm-kernel-upgrade.js. Fix: add the
#   missing script tag in the same position.
#
# Usage:
#   bash fix-healthcare-script-bugs.sh
#
# Run this from the repo root (/workspaces/TSM-Consultz-).

set -euo pipefail

WAR_ROOM="html/healthcare/hc-denial-war-room.html"
STRATEGIST="html/healthcare/hc-main-strategist.html"

for f in "$WAR_ROOM" "$STRATEGIST"; do
  if [ ! -f "$f" ]; then
    echo "ERROR: $f not found." >&2
    echo "Run this script from the repo root (/workspaces/TSM-Consultz-)." >&2
    exit 1
  fi
done

echo "== Backing up files =="
cp "$WAR_ROOM" "$WAR_ROOM.bak"
cp "$STRATEGIST" "$STRATEGIST.bak"
echo "  backups written as *.bak"

echo "== Fix 1: $WAR_ROOM (doubled path) =="
if grep -q 'src="./html/js/tsm-runtime-lock.js"' "$WAR_ROOM"; then
  sed -i 's|src="./html/js/tsm-runtime-lock.js"|src="/html/js/tsm-runtime-lock.js"|' "$WAR_ROOM"
  echo "  applied"
elif grep -q 'src="/html/js/tsm-runtime-lock.js"' "$WAR_ROOM"; then
  echo "  already fixed — skipping"
else
  echo "  WARNING: expected script tag not found in either old or new form — check manually" >&2
fi

echo "== Fix 2: $STRATEGIST (missing tsm-event-bus.js) =="
if grep -q "js/core/tsm-event-bus.js" "$STRATEGIST"; then
  echo "  already present — skipping"
else
  python3 - <<'PYEOF'
path = "html/healthcare/hc-main-strategist.html"
with open(path, "r") as f:
    content = f.read()

old = '<script src="/html/healthcare/js/relay-card.component.js"></script>\n  <script src="/js/core/tsm-kernel-upgrade.js"></script>'
new = '<script src="/html/healthcare/js/relay-card.component.js"></script>\n  <script src="/js/core/tsm-event-bus.js"></script>\n  <script src="/js/core/tsm-kernel-upgrade.js"></script>'

if old not in content:
    raise SystemExit("Expected block not found — file may have changed. Aborting without writing.")

content = content.replace(old, new, 1)
with open(path, "w") as f:
    f.write(content)

print("  applied")
PYEOF
fi

echo
echo "== Verify with the real test (requires server running on 8080) =="
echo "  node server.js &"
echo "  sleep 2"
echo "  npx playwright test tests/e2e/tsm-platform.spec.js --config=playwright.config.js -g 'Healthcare'"
echo "  kill %1"
echo
echo "== Done =="
echo "Review the diff with:"
echo "  git diff $WAR_ROOM $STRATEGIST"
echo
echo "This can ride along with the path-correction changes already in"
echo "tests/e2e/tsm-platform.spec.js on this branch, or go on its own —"
echo "your call. Once confirmed, delete the backups:"
echo "  rm $WAR_ROOM.bak $STRATEGIST.bak"