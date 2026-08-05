#!/usr/bin/env bash
# Apply the 6 patches in this folder to a fresh branch off main and push.
#
# Usage (run from anywhere, pass your local tsm-rcm repo path):
#   ./apply-and-push.sh /path/to/your/tsm-rcm
#
# What this does:
#   1. Makes sure your local main is up to date with origin/main
#   2. Creates fix/finops-auto-escalation-and-business-impact-delta off main
#   3. git am's all 6 patches onto it (preserves commit messages/authorship)
#   4. Pushes the branch to origin
#
# Nothing is pushed to main directly.
set -euo pipefail
REPO_DIR="${1:?Usage: ./apply-and-push.sh /path/to/your/tsm-rcm}"
PATCH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRANCH="fix/finops-auto-escalation-and-business-impact-delta"

# Exact filenames only -- this folder has many other patches from other
# sessions sharing the same 0001/0002/... numeric prefixes, so a wildcard
# like "0001-*.patch" can match several files and pass them ALL to git am
# in ASCII-sort order (capital letters sort before lowercase), silently
# applying the wrong patch first. Pin exact names instead.
PATCHES=(
  "0001-fix-finops-gate-unconditional-auto-escalation-timer-.patch"
  "0002-feat-finops-add-Business-Impact-Delta-to-strategist-.patch"
  "0003-feat-hotelops-add-Business-Impact-Delta-to-strategis.patch"
  "0004-feat-legal-add-Business-Impact-Delta-to-strategist-p.patch"
  "0005-feat-mortgage-add-Business-Impact-Delta-to-strategis.patch"
  "0006-feat-schools-add-Business-Impact-Delta-to-strategist.patch"
)

# Fail loudly and early if any expected file is missing, rather than
# discovering it mid-am with a half-applied branch.
for p in "${PATCHES[@]}"; do
  if [[ ! -f "$PATCH_DIR/$p" ]]; then
    echo "ERROR: expected patch not found: $PATCH_DIR/$p" >&2
    exit 1
  fi
done

cd "$REPO_DIR"
echo "==> Fetching and syncing main..."
git fetch origin
git checkout main
git pull --ff-only origin main
echo "==> Creating branch: $BRANCH"
git checkout -b "$BRANCH"
echo "==> Applying patches..."
for p in "${PATCHES[@]}"; do
  git am "$PATCH_DIR/$p"
done
echo "==> Pushing $BRANCH to origin..."
git push -u origin "$BRANCH"
echo ""
echo "Done. Open a PR here:"
echo "https://github.com/whiteheadlatorrey1-boop/tsm-rcm/pull/new/$BRANCH"
