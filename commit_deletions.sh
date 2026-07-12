#!/usr/bin/env bash
set -euo pipefail

# --- One-shot: commit + push the pending deletions safely ---
# Run this from the repo root in your Codespace terminal:
#   bash commit_deletions.sh

BRANCH_NAME="chore/remove-unused-portals"
COMMIT_MSG="Remove unused portal duplicates (dignity-portal, finops-suite, general-portal cleanup)"

echo "== Current branch =="
git rev-parse --abbrev-ref HEAD

echo
echo "== Rollback point (save this hash somewhere safe) =="
ROLLBACK_HASH=$(git rev-parse HEAD)
echo "$ROLLBACK_HASH"
echo "$ROLLBACK_HASH" > .last_rollback_hash.txt
echo "(also saved to .last_rollback_hash.txt in repo root)"

echo
echo "== Sanity check: staged change summary (should be only deletions) =="
git diff --stat

echo
read -p "Does the above look like ONLY deletions, nothing unexpected? Type 'yes' to continue: " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  echo "Aborting. Nothing was committed."
  exit 1
fi

echo
echo "== Staging all changes =="
git add -A

echo
echo "== Committing =="
git commit -m "$COMMIT_MSG"

echo
echo "== Creating branch and pushing =="
git checkout -b "$BRANCH_NAME"
git push -u origin "$BRANCH_NAME"

echo
echo "== Done =="
echo "Pushed to branch: $BRANCH_NAME"
echo "Rollback hash if you ever need it: $ROLLBACK_HASH"
echo "To undo everything and go back to before this commit:"
echo "  git checkout main && git reset --hard $ROLLBACK_HASH"
echo
echo "Next step: open a PR from '$BRANCH_NAME' into 'main' on GitHub and review the diff before merging."
