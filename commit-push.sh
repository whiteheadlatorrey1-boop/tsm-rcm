#!/usr/bin/env bash
# Commit and push current changes to tsm-rcm.
#
# Usage:
#   ./commit-push.sh "commit message"
#
# If pushing from an environment without cached git credentials,
# set GITHUB_TOKEN first so the remote URL can embed it:
#   export GITHUB_TOKEN=ghp_xxx
#   ./commit-push.sh "commit message"

set -euo pipefail

MSG="${1:-}"
if [ -z "$MSG" ]; then
  echo "Usage: $0 \"commit message\""
  exit 1
fi

cd "$(dirname "$0")"

echo "--- git status ---"
git status --short

if git diff --quiet && git diff --cached --quiet; then
  echo "No changes to commit."
  exit 0
fi

git add -A
git commit -m "$MSG"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"

if [ -n "${GITHUB_TOKEN:-}" ]; then
  REMOTE_URL="$(git remote get-url origin)"
  AUTH_URL="$(echo "$REMOTE_URL" | sed -E "s#https://#https://${GITHUB_TOKEN}@#")"
  echo "--- pushing via token-authenticated URL ---"
  git push "$AUTH_URL" "$BRANCH"
else
  echo "--- pushing via existing credentials/agent ---"
  git push origin "$BRANCH"
fi

echo "Done: pushed to origin/$BRANCH at $(git rev-parse --short HEAD)"