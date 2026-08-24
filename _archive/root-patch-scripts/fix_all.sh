#!/usr/bin/env bash
set -euo pipefail

# ONE script, no separate uploads needed. Run from /workspaces/tsm-rcm in Codespaces:
#   bash fix_all.sh
#
# What it does:
#   1. Writes the corrected demo/hotelops-demo.json (goto paths fixed:
#      html/concierge/concierge-*.html -> html/hotelops/hotelops-*.html,
#      which is what caused the 120s Playwright timeout hang).
#   2. Renames your already-captured rcm-os screenshots into
#      html/demo/preview-slides/rcm-os/slide-01.png..slide-08.png.
#   3. Commits and pushes whatever branch you're currently on.

echo "=== Part 1: writing corrected demo/hotelops-demo.json ==="
mkdir -p demo
cat > demo/hotelops-demo.json << 'JSON'
{
  "vertical": "hotelops",
  "note": "Selectors verified 2026-07-29 against whiteheadlatorrey1-boop/tsm-rcm, html/war-rooms/hotel-war/{hotelops-war-room,hotelops-strategist,hotelops-executive-portal}.html. Unlike healthcare's escalateToExecPortal(), relayToStrategist() here only writes to storage + shows a toast -- it does NOT navigate. Steps 006/007 explicitly goto the next page rather than click a link.",
  "steps": [
    {
      "shot": "001-war-room-load",
      "goto": "/html/hotelops/hotelops-war-room.html",
      "waitMs": 1500
    },
    {
      "shot": "002-load-sample-data",
      "click": "#btnLoadSample",
      "waitFor": "#kpi-bar",
      "waitMs": 800
    },
    {
      "shot": "003-mission-queue",
      "waitFor": "#missionQueue",
      "waitMs": 500
    },
    {
      "shot": "004-run-analysis",
      "click": "#btnAnalyze",
      "waitFor": "#aiOutput",
      "waitMs": 500,
      "waitForFunction": "(() => { const t = document.getElementById('aiOutput')?.textContent || ''; return t && !t.startsWith('Running analysis') && !t.startsWith('Run analysis'); })()"
    },
    {
      "shot": "005-relay-to-strategist",
      "click": "#btnRelay",
      "waitMs": 1200
    },
    {
      "shot": "006-strategist-view",
      "goto": "/html/hotelops/hotelops-strategist.html",
      "waitFor": ".sec-hdr",
      "waitMs": 1200
    },
    {
      "shot": "007-exec-portal-view",
      "goto": "/html/hotelops/hotelops-executive-portal.html",
      "waitFor": ".sec-hdr",
      "waitMs": 1200
    },
    {
      "shot": "008-closing",
      "waitMs": 800
    }
  ]
}
JSON
git add demo/hotelops-demo.json
echo "Wrote demo/hotelops-demo.json"

echo ""
echo "=== Part 2: renaming rcm-os screenshots into preview-slides ==="
SRC="tests/e2e/demo/screenshots/rcm-os"
DEST="html/demo/preview-slides/rcm-os"

if [ ! -d "$SRC" ]; then
  echo "WARNING: $SRC not found -- skipping rcm-os slide rename."
  echo "(Did tests/e2e/demo/rcm-os-demo.spec.js run and produce screenshots there?)"
else
  mkdir -p "$DEST"
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
  echo "(search data-slug=\"rcm-os\") if you want slide 8 reachable in the modal."
fi

echo ""
echo "=== Committing ==="
if git diff --cached --quiet; then
  echo "Nothing staged -- nothing to commit."
else
  git commit -m "Fix hotelops-demo.json goto paths + add rcm-os preview-slide thumbnails"
fi

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
