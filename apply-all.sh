#!/usr/bin/env bash
# apply-all.sh — applies both pending patches on fresh branches off main and pushes.
#
#   1. fix/mount-enterprise-enrichment-router  <- mount-enterprise-router.patch
#   2. test/bpo-relay-sentinel-propagation     <- bpo-relay-test.patch
#
# Run from the repo root (where server.js lives), with both .patch files
# sitting next to this script (same dir it's invoked from, or set PATCH_DIR).
#
# Usage:
#   ./apply-all.sh
#   PATCH_DIR=/path/to/patches ./apply-all.sh
#
# Each patch is applied on its own fresh branch off origin/main (per the
# "PRs must be created from fresh branches off main after squash-merges"
# rule). Tries `git am` first (preserves commit metadata/message); falls
# back to `git apply` + manual commit if am fails (the known GPG-signing
# blocker) — matches the workaround already used earlier in this project.

set -euo pipefail

PATCH_DIR="${PATCH_DIR:-$(pwd)}"
ENRICH_PATCH="$PATCH_DIR/mount-enterprise-router.patch"
BPO_TEST_PATCH="$PATCH_DIR/bpo-relay-test.patch"

for f in "$ENRICH_PATCH" "$BPO_TEST_PATCH"; do
  if [ ! -f "$f" ]; then
    echo "❌ Missing patch file: $f"
    echo "   Set PATCH_DIR to wherever the .patch files actually live, e.g.:"
    echo "   PATCH_DIR=~/Downloads ./apply-all.sh"
    exit 1
  fi
done

if [ ! -f "server.js" ]; then
  echo "❌ server.js not found in $(pwd) — run this from the repo root."
  exit 1
fi

# apply_patch <patch-file> <branch-name> <fallback-commit-msg>
apply_patch() {
  local patch_file="$1"
  local branch="$2"
  local fallback_msg="$3"

  echo ""
  echo "── $branch ─────────────────────────────────────────────"

  if git show-ref --verify --quiet "refs/heads/$branch"; then
    echo "⚠️  Branch $branch already exists locally — skipping checkout -b, reusing it."
    git checkout "$branch"
  else
    git checkout -b "$branch" main
  fi

  if git am --3way "$patch_file" 2>/tmp/git-am-err.log; then
    echo "✅ Applied via git am (commit metadata preserved)."
  else
    echo "⚠️  git am failed (likely GPG signing) — falling back to git apply + manual commit."
    git am --abort 2>/dev/null || true
    git apply --3way "$patch_file"
    git add -A
    git commit -m "$fallback_msg"
    echo "✅ Applied via git apply + manual commit."
  fi

  git push -u origin "$branch"
  echo "✅ Pushed $branch to origin."

  git checkout main
}

echo "Fetching latest main..."
git fetch origin main
git checkout main
git pull origin main

apply_patch "$ENRICH_PATCH" \
  "fix/mount-enterprise-enrichment-router" \
  "Mount server/enterprise/api/enterprise-router.js at /api/enterprise"

apply_patch "$BPO_TEST_PATCH" \
  "test/bpo-relay-sentinel-propagation" \
  "Add Playwright relay-propagation test for BPO doc-search -> war-room -> strategist -> exec -> sentinel chain"

echo ""
echo "════════════════════════════════════════════════════════"
echo "Done. Two branches pushed to origin:"
echo "  fix/mount-enterprise-enrichment-router"
echo "  test/bpo-relay-sentinel-propagation"
echo ""
echo "Open PRs for both from origin — you're back on main locally."
echo "════════════════════════════════════════════════════════"