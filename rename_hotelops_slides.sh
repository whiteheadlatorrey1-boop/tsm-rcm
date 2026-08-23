#!/usr/bin/env bash
set -euo pipefail

# Run from /workspaces/tsm-rcm in Codespaces.
# Renames the captured hotelops-demo screenshots into
# html/demo/preview-slides/hotelops-demo/slide-01.png..slide-08.png,
# matching what presentation-hub.html expects (data-slides="13" though --
# see note below).

SRC="tests/e2e/demo/screenshots/hotelops"
DEST="html/demo/preview-slides/hotelops-demo"

if [ ! -d "$SRC" ]; then
  echo "ERROR: $SRC not found. Run the hotelops-demo Playwright test first."
  exit 1
fi

mkdir -p "$DEST"
order=(001-war-room-load 002-load-sample-data 003-mission-queue 004-run-analysis 005-relay-to-strategist 006-strategist-view 007-exec-portal-view 008-closing)
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
echo "Wrote $((n-1)) slides to $DEST"
echo ""
echo "NOTE: presentation-hub.html's hotelops-demo card says data-slides=\"13\""
echo "but this story only produces 8 screenshots. Either:"
echo "  a) bump data-slides down to 8 in html/demo/presentation-hub.html"
echo "     (search data-slug=\"hotelops-demo\"), or"
echo "  b) the story is missing steps for slides 9-13 and needs more shots added."
echo "Leaving this as a manual decision rather than guessing."

git add "$DEST"
git commit -m "Add hotelops-demo preview-slide thumbnails from Playwright run"
CURRENT_BRANCH=$(git branch --show-current)
git push origin "$CURRENT_BRANCH"

echo ""
echo "Pushed to '$CURRENT_BRANCH'. Open/merge if needed:"
echo "  https://github.com/whiteheadlatorrey1-boop/tsm-rcm/compare/${CURRENT_BRANCH}?expand=1"
