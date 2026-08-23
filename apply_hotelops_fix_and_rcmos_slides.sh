#!/usr/bin/env bash
set -euo pipefail

# Run from /workspaces/tsm-rcm in Codespaces, with hotelops-demo.json
# uploaded into the same directory as this script.
#
# Part 1: fixes demo/hotelops-demo.json's goto paths (they pointed at
#         an unrelated html/concierge/ page instead of html/hotelops/,
#         which is what caused the 120s timeout hang).
# Part 2: renames your already-captured rcm-os screenshots from
#         NNN-name.png into slide-01.png..slide-08.png and places them
#         in html/demo/preview-slides/rcm-os/ where presentation-hub.html
#         actually looks for them.

if [ ! -f "hotelops-demo.json" ]; then
  echo "ERROR: hotelops-demo.json not found in $(pwd)."
  echo "Upload it into the repo root first, then re-run this script."
  exit 1
fi

echo "=== Part 1: applying hotelops-demo.json fix ==="
cp hotelops-demo.json demo/hotelops-demo.json
git add demo/hotelops-demo.json

echo "=== Part 2: renaming rcm-os screenshots into preview-slides ==="
SRC="tests/e2e/demo/screenshots/rcm-os"
DEST="html/demo/preview-slides/rcm-os"

if [ ! -d "$SRC" ]; then
  echo "WARNING: $SRC not found -- skipping rcm-os slide rename."
  echo "(Did the rcm-os-demo.spec.js run and produce screenshots there?)"
else
  mkdir -p "$DEST"
  # Expected order from demo/rcm-os-demo.json:
  order=(001-daily-load 002-weekly-cadence 003-monthend-cadence 004-framework-cadence 005-executive-cadence 006-flow-chain 007-sla-indicators 008-closing-executive)
  n=1
  for name in "${order[@]}"; do
    src_file="$SRC/${name}.png"
    if [ -f "$src_file" ]; then
      padded=$(printf "%02d" "$n")
      cp "$src_file" "$DEST/slide-${padded}.png"
      n=$((n+1))
    else
      echo "WARNING: expected $src_file not found, skipping"
    fi
  done
  git add "$DEST"
  echo "Wrote $((n-1)) slides to $DEST"
  echo ""
  echo "NOTE: presentation-hub.html's rcm-os card currently says data-slides=\"7\""
  echo "but there are 8 real slides. Bump it to 8 in html/demo/presentation-hub.html"
  echo "(search for data-slug=\"rcm-os\") if you want slide 8 reachable in the modal."
fi

echo ""
echo "=== Committing ==="
git commit -m "Fix hotelops-demo.json goto paths + add rcm-os preview-slide thumbnails"

echo "=== Pushing current branch ==="
CURRENT_BRANCH=$(git branch --show-current)
git push origin "$CURRENT_BRANCH"

echo ""
echo "Done. Pushed to '$CURRENT_BRANCH'."
echo "If that's not main, open/merge the PR:"
echo "  https://github.com/whiteheadlatorrey1-boop/tsm-rcm/compare/${CURRENT_BRANCH}?expand=1"
echo ""
echo "Then re-run the hotelops demo to confirm the fix:"
echo "  npx playwright test tests/e2e/demo/hotelops-demo.spec.js"
echo ""
echo "Once it passes, rename those screenshots into preview-slides/hotelops-demo/"
echo "the same way this script did for rcm-os (order: 001-war-room-load,"
echo "002-load-sample-data, 003-mission-queue, 004-run-analysis,"
echo "005-relay-to-strategist, 006-strategist-view, 007-exec-portal-view, 008-closing)."
