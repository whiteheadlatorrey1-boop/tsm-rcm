#!/usr/bin/env bash
# Removes the stale duplicate html/war-rooms/health-war/hc-denial-war-room.html
# (missing the TSMWorkflowStage integration present in the real one) and
# repoints its 2 inbound references to the real file at
# html/healthcare/hc-denial-war-room.html.
#
# Usage: run from the repo root on whichever branch you want this applied to:
#   cd /workspaces/tsm-rcm && bash delete-duplicate-hc-denial-war-room.sh

set -e

STALE="html/war-rooms/health-war/hc-denial-war-room.html"
REAL="/html/healthcare/hc-denial-war-room.html"
STALE_URL="/html/war-rooms/health-war/hc-denial-war-room.html"

if [ ! -f "$STALE" ]; then
  echo "Stale duplicate not found at $STALE — nothing to do (already removed, or this branch never had it)."
  exit 0
fi

echo "== Repointing references =="
for f in html/bpo-files/suite-hub.html html/bpo-files/bpo-internal1.html; do
  if [ -f "$f" ] && grep -q "$STALE_URL" "$f"; then
    sed -i "s#$STALE_URL#$REAL#g" "$f"
    echo "  updated: $f"
  else
    echo "  skip (no reference found): $f"
  fi
done

echo "== Deleting stale duplicate =="
git rm "$STALE" 2>/dev/null || rm "$STALE"
echo "  removed: $STALE"

echo ""
echo "Review with: git diff --cached  (or git status)"
echo "Then: git add -A && git commit -m 'chore(healthcare): remove stale hc-denial-war-room duplicate, repoint refs to canonical file' && git push"
