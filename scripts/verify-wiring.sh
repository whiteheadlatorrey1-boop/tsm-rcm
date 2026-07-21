#!/bin/bash
set -e

echo "=========================================="
echo "Wiring Verification + Real Diffs"
echo "=========================================="
echo ""

echo "--- Is html/shared/runtime/enterprise/ referenced anywhere in TRACKED files? ---"
echo "(if this is empty, the 25 new modules are orphaned — built but not wired)"
grep -rl "shared/runtime/enterprise" html/war-rooms/ html/*.html server.js 2>/dev/null | grep -v '^html/shared/runtime' || echo "NONE FOUND — orphaned"
echo ""

echo "--- Is it referenced anywhere at all, including untracked files? ---"
grep -rl "shared/runtime/enterprise" . --include="*.html" --include="*.js" 2>/dev/null | grep -v '^\./html/shared/runtime' | grep -v '/.git/'
echo ""

echo "--- War-room directory overlap re-check (explicit, one at a time) ---"
for v in construction finops healthcare insurance legal real-estate; do
  echo ""
  echo "## $v"
  echo -n "Already tracked in git (main): "
  git ls-files "html/war-rooms/$v/" | wc -l
  echo -n "Untracked new content: "
  find "html/war-rooms/$v/" -type f 2>/dev/null | wc -l
  find "html/war-rooms/$v/" -type f 2>/dev/null | head -5
done
echo ""

echo "--- Full diff: finops-main-strategist.html ---"
git diff html/finops-main-strategist.html
echo ""

echo "--- Full diff: tests/e2e/tsm-platform.spec.js ---"
git diff tests/e2e/tsm-platform.spec.js
echo ""

echo "=========================================="
echo "Done. Paste this full output back for review."
echo "=========================================="