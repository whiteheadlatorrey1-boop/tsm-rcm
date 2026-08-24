#!/usr/bin/env bash
set -euo pipefail

# presentation-hub.html (in html/demo/) requests thumbnails from
# ./preview-slides/<slug>/slide-01.png, which resolves relative to
# html/demo/. But preview-slides/ actually lives at the repo root,
# so every thumbnail 404s. This copies it into html/demo/ so the
# relative paths in the page actually resolve.
#
# Run this from /workspaces/tsm-rcm in Codespaces.

SRC="preview-slides"
DEST="html/demo/preview-slides"

if [ ! -d "$SRC" ]; then
  echo "ERROR: $SRC not found in $(pwd). Run this from the repo root."
  exit 1
fi

if [ -d "$DEST" ]; then
  echo "Backing up existing $DEST to ${DEST}.old-$(date +%s) ..."
  mv "$DEST" "${DEST}.old-$(date +%s)"
fi

echo "Copying preview-slides/ into html/demo/ ..."
cp -r "$SRC" "$DEST"

echo "Committing ..."
git add "$DEST"
git commit -m "Add preview-slides/ under html/demo so presentation-hub.html thumbnails resolve"

echo "Pushing current branch ..."
CURRENT_BRANCH=$(git branch --show-current)
git push origin "$CURRENT_BRANCH"

echo ""
echo "Done. Pushed to '$CURRENT_BRANCH'."
echo "If that's not main, open a PR and merge it:"
echo "  https://github.com/whiteheadlatorrey1-boop/tsm-rcm/compare/${CURRENT_BRANCH}?expand=1"
echo ""
echo "Then RESTART your dev server and reload:"
echo "  https://<your-codespace>-8080.app.github.dev/demo/presentation-hub.html"
