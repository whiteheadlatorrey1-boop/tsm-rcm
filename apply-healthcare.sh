#!/usr/bin/env bash
# apply-healthcare.sh — applies the healthcare relay-chain fix + its
# Playwright test on fresh branches off main and pushes.
#
#   1. fix/healthcare-war-room-relay-chain       <- hc-relay-chain-fix.patch
#   2. test/healthcare-relay-sentinel-propagation <- hc-relay-test.patch
#
# Run from the repo root, with both .patch files next to this script
# (or set PATCH_DIR). Same shape as apply-all.sh from the BPO pass:
# tries `git am` first, falls back to `git apply` + manual commit on the
# known GPG-signing failure.
#
# Usage:
#   ./apply-healthcare.sh
#   PATCH_DIR=/path/to/patches ./apply-healthcare.sh

set -euo pipefail

PATCH_DIR="${PATCH_DIR:-$(pwd)}"
FIX_PATCH="$PATCH_DIR/hc-relay-chain-fix.patch"
TEST_PATCH="$PATCH_DIR/hc-relay-test.patch"

for f in "$FIX_PATCH" "$TEST_PATCH"; do
  if [ ! -f "$f" ]; then
    echo "❌ Missing patch file: $f"
    echo "   Set PATCH_DIR to wherever the .patch files actually live, e.g.:"
    echo "   PATCH_DIR=~/Downloads ./apply-healthcare.sh"
    exit 1
  fi
done

if [ ! -f "server.js" ]; then
  echo "❌ server.js not found in $(pwd) — run this from the repo root."
  exit 1
fi

apply_patch() {
  local patch_file="$1"
  local branch="$2"
  local fallback_msg="$3"

  echo ""
  echo "── $branch ─────────────────────────────────────────────"

  if git show-ref --verify --quiet "refs/heads/$branch"; then
    echo "⚠️  Branch $branch already exists locally — reusing it."
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

apply_patch "$FIX_PATCH" \
  "fix/healthcare-war-room-relay-chain" \
  "Fix healthcare relay chain: war-room doc-search intake/escalate + sentinel exec-portal path"

apply_patch "$TEST_PATCH" \
  "test/healthcare-relay-sentinel-propagation" \
  "Add Playwright relay-propagation test for Healthcare doc-search -> war-room -> strategist -> exec/sentinel chain"

echo ""
echo "════════════════════════════════════════════════════════"
echo "Done. Two branches pushed to origin:"
echo "  fix/healthcare-war-room-relay-chain"
echo "  test/healthcare-relay-sentinel-propagation"
echo ""
echo "NOTE: the test branch was built off fresh main and does NOT include"
echo "the fix commit — merge fix/healthcare-war-room-relay-chain first,"
echo "or the escalate-button test (test #2) will fail against unfixed code."
echo "════════════════════════════════════════════════════════"
