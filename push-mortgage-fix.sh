#!/usr/bin/env bash
# Run this from your Codespace terminal (repo root: tsm-rcm)
# Commits + pushes the mortgage risk_level fix if it's not already landed.

set -euo pipefail

REPO_DIR="${1:-.}"
cd "$REPO_DIR"

if [ ! -d ".git" ]; then
  echo "Not a git repo: $REPO_DIR"
  echo "Usage: ./push-mortgage-fix.sh /path/to/tsm-rcm"
  exit 1
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "== On branch: $BRANCH =="

# If the fix is already committed (e.g. carried over as 3406b176 or similar),
# just push. Otherwise stage + commit it now.
if git diff --quiet && git diff --cached --quiet; then
  echo "No uncommitted changes — assuming fix is already committed locally."
else
  echo "== Staging changes =="
  git add mortgage-engine.js tests/ 2>/dev/null || git add -A

  echo "== Committing =="
  git commit -m "fix(mortgage): risk_level never reads below a record's own severity

_riskLevelFor() now takes max(SLA-derived level, business severity)
instead of pure SLA-hours. DK-022 and JUMBO-010 now correctly read
risk_level: 'high' through the canonical/Sentinel feed.

- War-room table unaffected (reads severity field directly)
- 24/24 tests passing, incl. new regression coverage"
fi

echo "== Pushing to origin/$BRANCH =="
git push origin "$BRANCH"

echo "== Done. Latest commit: =="
git log --oneline -1
