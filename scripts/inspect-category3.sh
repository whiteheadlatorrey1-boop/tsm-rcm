#!/bin/bash
set -e

echo "=========================================="
echo "Category 3 Deep Inspection"
echo "=========================================="
echo ""

echo "--- html/shared/runtime/ (matches the proposed architecture email) ---"
find html/shared/runtime -type f 2>/dev/null | sort
echo ""

echo "--- New top-level war-room directories: do they overlap with existing tracked verticals? ---"
for v in construction finops healthcare insurance legal real-estate; do
  echo ""
  echo "## html/war-rooms/$v/"
  echo "Untracked contents:"
  git status --porcelain "html/war-rooms/$v/" 2>/dev/null | head -20
  echo "Already-tracked files in this path (if any):"
  git ls-files "html/war-rooms/$v/" | head -10
done
echo ""

echo "--- node --check on any new .js files in Category 3 ---"
git status --porcelain | grep '^??' | awk '{print $2}' | while read -r path; do
  if [ -d "$path" ]; then
    find "$path" -name "*.js" 2>/dev/null
  elif [[ "$path" == *.js ]]; then
    echo "$path"
  fi
done | while read -r jsfile; do
  if [ -f "$jsfile" ]; then
    node --check "$jsfile" 2>&1 | head -3 && echo "OK: $jsfile" || echo "SYNTAX ERROR: $jsfile"
  fi
done
echo ""

echo "--- reports/*.txt: sample the first one to see what these actually record ---"
FIRST_REPORT=$(git status --porcelain | grep '^??' | awk '{print $2}' | grep '^reports/' | head -1)
if [ -n "$FIRST_REPORT" ]; then
  echo "Sample: $FIRST_REPORT"
  head -30 "$FIRST_REPORT"
fi
echo ""

echo "--- Category 2 diffs (the 6 modified tracked files) ---"
for f in $(cat /tmp/triage-modified.txt); do
  echo ""
  echo "## $f"
  git diff --stat "$f"
done

echo ""
echo "=========================================="
echo "Review the output above, then decide per-group."
echo "=========================================="