#!/usr/bin/env bash
# Run from inside the repo in your Codespace. Uses `gh` (already authenticated there).
set -euo pipefail

PR=260

echo "=== PR #$PR status ==="
gh pr view "$PR" --json state,mergeable,mergeStateStatus,commits,statusCheckRollup \
  --jq '{
    state: .state,
    mergeable: .mergeable,
    mergeStateStatus: .mergeStateStatus,
    commitCount: (.commits | length),
    checks: [.statusCheckRollup[]? | {name: .name, status: .status, conclusion: .conclusion}]
  }'

echo
echo "=== Last 3 commits on the PR ==="
gh pr view "$PR" --json commits --jq '.commits[-3:][] | .messageHeadline'