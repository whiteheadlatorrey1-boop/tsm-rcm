#!/usr/bin/env bash
set -euo pipefail

# Applies the generated slide thumbnails for the 5 pitch-deck cards
# (ameris-construction, honorhealth, hotelops-trivago,
# property-accountant, first-american-mortgage) into html/demo/preview-slides.
#
# Run this from /workspaces/tsm-rcm in Codespaces, with
# pitch-deck-thumbnails.tar.gz uploaded into the same directory.

TARBALL="pitch-deck-thumbnails.tar.gz"

if [ ! -f "$TARBALL" ]; then
  echo "ERROR: $TARBALL not found in $(pwd)."
  echo "Upload it into the repo root first, then re-run this script."
  exit 1
fi

echo "Extracting $TARBALL ..."
tar -xzf "$TARBALL"

echo "Copying into html/demo/preview-slides/ ..."
mkdir -p html/demo/preview-slides
cp -r preview-slides/* html/demo/preview-slides/
rm -rf preview-slides

echo "Committing ..."
git add html/demo/preview-slides/ameris-construction \
        html/demo/preview-slides/first-american-mortgage \
        html/demo/preview-slides/honorhealth \
        html/demo/preview-slides/hotelops-trivago \
        html/demo/preview-slides/property-accountant
git commit -m "Generate slide thumbnails for 5 pitch-deck cards from their source PPTX files"

echo "Pushing current branch ..."
CURRENT_BRANCH=$(git branch --show-current)
git push origin "$CURRENT_BRANCH"

echo ""
echo "Done. Pushed to '$CURRENT_BRANCH'."
echo "If that's not main, open a PR and merge it:"
echo "  https://github.com/whiteheadlatorrey1-boop/tsm-rcm/compare/${CURRENT_BRANCH}?expand=1"
echo ""
echo "Then RESTART your dev server and reload presentation-hub.html."
echo ""
echo "Still not generated (need your live server + Playwright, not covered by this script):"
echo "  - hotelops-demo   (tests/e2e/demo/hotelops-demo.spec.js)"
echo "  - rcm-os          (tests/e2e/demo/rcm-os-demo.spec.js)"
