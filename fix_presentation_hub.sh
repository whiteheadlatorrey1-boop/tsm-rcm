#!/usr/bin/env bash
set -euo pipefail

# Promotes the repo-root presentation-hub.html (the one you actually want,
# "TSM Deck Archive") into html/demo/, which is the only path Express
# actually serves. Run this from /workspaces/tsm-rcm in Codespaces.

ROOT_FILE="presentation-hub.html"
TARGET="html/demo/presentation-hub.html"

if [ ! -f "$ROOT_FILE" ]; then
  echo "ERROR: $ROOT_FILE not found in $(pwd). Run this from the repo root."
  exit 1
fi

echo "Backing up old served version to ${TARGET}.old-$(date +%s) ..."
cp "$TARGET" "${TARGET}.old-$(date +%s)" 2>/dev/null || echo "(no existing file to back up)"

echo "Promoting root copy into html/demo/ ..."
cp "$ROOT_FILE" "$TARGET"

echo "Committing ..."
git add "$TARGET"
git commit -m "Promote root presentation-hub.html into html/demo (fixes 404 at /demo/presentation-hub.html)"

echo "Pushing to main ..."
git push origin main

echo ""
echo "Done. Now RESTART your dev server (Ctrl+C then re-run node server.js / npm start)"
echo "so Express picks up the new file, then visit:"
echo "  https://<your-codespace>-8080.app.github.dev/demo/presentation-hub.html"