#!/usr/bin/env bash
# apply_construction_fix.sh
#
# Same bug as the finops-suite fix, different vertical: ~32 files under
# html/construction-suite/ load tsm-runtime-lock.js, tsm-event-contract.js,
# and tsm-autonomy-layer.js via a relative path (./html/js/...) that 404s
# because these pages are served under /construction-suite/... (one or more
# directories deep from the html/js/ they're actually trying to reach).
# That kills window.TSMEventBus, which breaks TSM-KERNEL init the same way
# it did on Branch Operations.
#
# Fix: make the path absolute (/html/js/...) so it resolves correctly
# regardless of how deep the page itself is nested.
#
# Usage: run from the repo root (where html/ lives).
#   bash apply_construction_fix.sh
#
# Idempotent — safe to re-run.

set -euo pipefail

if [ ! -d "html/construction-suite" ]; then
  echo "ERROR: run this from the repo root (html/construction-suite not found here)." >&2
  exit 1
fi

echo "== Fixing relative script paths in html/construction-suite/ =="
FILES=$(grep -rl 'src="\./html/js/tsm-runtime-lock\.js"\|src="\./html/js/tsm-event-contract\.js"\|src="\./html/js/tsm-autonomy-layer\.js"' html/construction-suite/ 2>/dev/null || true)

if [ -z "$FILES" ]; then
  echo "  no files need this fix (already applied?)"
else
  COUNT=0
  while IFS= read -r f; do
    sed -i \
      -e 's#src="\./html/js/tsm-runtime-lock\.js"#src="/html/js/tsm-runtime-lock.js"#g' \
      -e 's#src="\./html/js/tsm-event-contract\.js"#src="/html/js/tsm-event-contract.js"#g' \
      -e 's#src="\./html/js/tsm-autonomy-layer\.js"#src="/html/js/tsm-autonomy-layer.js"#g' \
      "$f"
    COUNT=$((COUNT+1))
  done <<< "$FILES"
  echo "  fixed $COUNT file(s)"
fi

echo "== Done =="
echo "Verify: start the server, then check these return 200 (not 404):"
echo "  curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/html/js/tsm-runtime-lock.js"
echo "  curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/html/js/tsm-event-contract.js"
echo "  curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/html/js/tsm-autonomy-layer.js"
echo "(those three files are shared across verticals, so if you already"
echo "verified them for finops-suite they'll already show 200 here too --"
echo "the real check is opening a construction-suite page and confirming"
echo "no 404s / no 'EventBus not found' warning in the console.)"