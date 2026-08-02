#!/usr/bin/env bash
# Reapplies the 6 stale-link fixes to html/tsm-career-training-platform.html
# Safe to re-run: only replaces strings if they're still present, and moves
# the BPO playbook file only if it hasn't already been moved.
#
# Usage: run from the repo root (where html/ lives), e.g.:
#   cd /workspaces/tsm-rcm && bash apply-career-training-fixes.sh

set -e

FILE="html/tsm-career-training-platform.html"

if [ ! -f "$FILE" ]; then
  echo "ERROR: $FILE not found. Run this script from the repo root."
  exit 1
fi

echo "== Step 1: move BPO Competitive Playbook file if needed =="
if [ -f "tsm-bpo-competitive-playbook.html" ]; then
  mkdir -p html/bpo-files
  git mv tsm-bpo-competitive-playbook.html html/bpo-files/tsm-bpo-competitive-playbook.html 2>/dev/null \
    || mv tsm-bpo-competitive-playbook.html html/bpo-files/tsm-bpo-competitive-playbook.html
  echo "  moved tsm-bpo-competitive-playbook.html -> html/bpo-files/"
elif [ -f "html/bpo-files/tsm-bpo-competitive-playbook.html" ]; then
  echo "  already in place at html/bpo-files/tsm-bpo-competitive-playbook.html — skipping"
else
  echo "  WARNING: playbook file not found at either expected location — skipping move"
fi

echo "== Step 2: fix links in $FILE =="

python3 - "$FILE" <<'PYEOF'
import sys

path = sys.argv[1]
with open(path, "r", encoding="utf-8") as f:
    s = f.read()

fixes = [
    ("/html/healthcare/crc-hc-practice.html", "/html/healthcare/hc-academy/crc-hc-practice.html"),
    ("/html/healthcare/crcr-scenarios.html", "/html/healthcare/hc-academy/crcr-scenarios.html"),
    ("/html/finops-suite/finops-war-room.html", "/html/finops-suite/finops-war/finops-war-room.html"),
    ("/html/war-rooms/bpo/tsm-bpo-competitive-playbook.html", "/html/bpo-files/tsm-bpo-competitive-playbook.html"),
    ("/html/construction-suite/construction-war-room.html", "/html/war-rooms/construct-war/construction-war-room.html"),
    ("/html/legal-pro/legal-war-room.html", "/html/war-rooms/legal-war/legal-war-room.html"),
]

total = 0
for old, new in fixes:
    count = s.count(old)
    if count:
        s = s.replace(old, new)
        print(f"  fixed: {old} -> {new}  ({count} occurrence(s))")
        total += count
    else:
        print(f"  skip (already fixed or not found): {old}")

with open(path, "w", encoding="utf-8") as f:
    f.write(s)

print(f"\nTotal replacements: {total}")
PYEOF

echo ""
echo "Done. Review with: git diff -- $FILE"
echo "Then: git add -A && git commit -m 'fix(career-training): repair stale links' && git push"
