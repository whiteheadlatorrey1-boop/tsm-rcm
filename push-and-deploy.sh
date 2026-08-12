#!/usr/bin/env bash
# Push current branch to origin/main and watch the fly-deploy.yml Action run.
# Run this from the repo root in your Codespace terminal.
set -euo pipefail

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BRANCH" != "main" ]; then
  echo "You're on '$BRANCH', not 'main'. fly-deploy.yml only triggers on pushes to main."
  read -p "Push '$BRANCH' -> origin/main anyway? [y/N] " ans
  if [[ "$ans" != "y" && "$ans" != "Y" ]]; then
    echo "Aborted."
    exit 1
  fi
  git push origin "$BRANCH":main
else
  git push origin main
fi

echo
echo "Pushed. Watching the Fly Deploy Action (Ctrl+C to stop watching; the deploy keeps running)..."
sleep 3

if command -v gh >/dev/null 2>&1; then
  RUN_ID="$(gh run list --workflow=fly-deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
  if [ -n "${RUN_ID:-}" ]; then
    gh run watch "$RUN_ID" --exit-status
  else
    echo "Couldn't find a run yet — check the Actions tab on GitHub directly."
  fi
else
  echo "gh CLI not found. Check the Actions tab on GitHub:"
  echo "  https://github.com/whiteheadlatorrey1-boop/tsm-rcm/actions/workflows/fly-deploy.yml"
fi

echo
echo "Once green, verify at:"
echo "  https://app.tsmatter.com/l1-copilot/noc/noc-war-room.html"
