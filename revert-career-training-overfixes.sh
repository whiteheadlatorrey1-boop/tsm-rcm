#!/usr/bin/env bash
# Reverts 4 of the "fixes" applied by apply-career-training-fixes.sh on
# feat/mission-preview-phase4, which has a different (older) file layout
# than main: these links were NOT broken here and the script wrongly
# repointed them at paths that don't exist on this branch.
#
# Usage: run from the repo root:
#   cd /workspaces/tsm-rcm && bash revert-career-training-overfixes.sh

set -e

FILE="html/tsm-career-training-platform.html"

if [ ! -f "$FILE" ]; then
  echo "ERROR: $FILE not found. Run this script from the repo root."
  exit 1
fi

python3 - "$FILE" <<'PYEOF'
import sys

path = sys.argv[1]
with open(path, "r", encoding="utf-8") as f:
    s = f.read()

# (wrong path introduced by the script, correct path for THIS branch)
reverts = [
    ("/html/healthcare/hc-academy/crc-hc-practice.html", "/html/healthcare/crc-hc-practice.html"),
    ("/html/healthcare/hc-academy/crcr-scenarios.html", "/html/healthcare/crcr-scenarios.html"),
    ("/html/finops-suite/finops-war/finops-war-room.html", "/html/finops-suite/finops-war-room.html"),
    ("/html/bpo-files/tsm-bpo-competitive-playbook.html", "/html/war-rooms/bpo/tsm-bpo-competitive-playbook.html"),
]

total = 0
for wrong, right in reverts:
    count = s.count(wrong)
    if count:
        s = s.replace(wrong, right)
        print(f"  reverted: {wrong} -> {right}  ({count} occurrence(s))")
        total += count
    else:
        print(f"  skip (not found, already reverted?): {wrong}")

with open(path, "w", encoding="utf-8") as f:
    f.write(s)

print(f"\nTotal reverted: {total}")
PYEOF

echo ""
echo "Review with: git diff -- $FILE"
echo "Then: git add -A && git commit -m 'fix(career-training): revert over-fixes that broke links on this branch' && git push"
