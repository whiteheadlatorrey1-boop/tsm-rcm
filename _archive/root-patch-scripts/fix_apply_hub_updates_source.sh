#!/usr/bin/env bash
set -euo pipefail

# WHY THIS SCRIPT EXISTS:
# apply-hub-updates is a long-lived branch that keeps getting merged into
# main (PRs #91-#98 so far). It has its OWN old copy of
# html/demo/presentation-hub.html with data-slides="13" for hotelops-demo
# and data-slides="7" for rcm-os -- values from before those were fixed.
# Merging main into apply-hub-updates, or apply-hub-updates into main,
# doesn't fix this: there's no line conflict, so Git just keeps carrying
# apply-hub-updates' own stale value forward every time. The fix has to
# be committed ON apply-hub-updates itself, or this will keep coming back
# every time that branch gets merged again.
#
# Run from /workspaces/tsm-rcm in Codespaces:
#   bash fix_apply_hub_updates_source.sh

FILE="html/demo/presentation-hub.html"

echo "=== Switching to apply-hub-updates and syncing ==="
git fetch origin
git checkout apply-hub-updates
git pull origin apply-hub-updates

if [ ! -f "$FILE" ]; then
  echo "ERROR: $FILE not found on this branch."
  exit 1
fi

echo "=== Auditing every card's data-slides against real files ==="
python3 << 'PYEOF'
import re, os

path = "html/demo/presentation-hub.html"
base = "html/demo/preview-slides"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

pattern = re.compile(r'(data-slug="([^"]+)"\s+data-slides=")(\d+)(")')
changes = []

def fix(m):
    slug, declared = m.group(2), m.group(3)
    folder = os.path.join(base, slug)
    if not os.path.isdir(folder):
        return m.group(0)
    actual = len([f for f in os.listdir(folder) if f.startswith('slide-') and f.endswith('.png')])
    if str(actual) != declared:
        changes.append((slug, declared, actual))
        return f'{m.group(1)}{actual}{m.group(4)}'
    return m.group(0)

new_content = pattern.sub(fix, content)

if changes:
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Corrected on apply-hub-updates:")
    for slug, old, new in changes:
        print(f"  {slug}: {old} -> {new}")
else:
    print("No mismatches on this branch -- nothing to fix here.")
PYEOF

if ! git diff --quiet -- "$FILE"; then
  git add "$FILE"
  git commit -m "Fix data-slides mismatches directly on apply-hub-updates

This branch's own copy of presentation-hub.html had stale values that
kept reverting main's fixes every time apply-hub-updates got merged
(happened in both PR #97 and #98). Fixing it here, at the source, so
future merges of this branch stop undoing this."
  git push origin apply-hub-updates
  echo ""
  echo "Pushed the fix directly to apply-hub-updates."
else
  echo "apply-hub-updates already matches -- nothing to push."
fi

echo ""
echo "=== IMPORTANT: main still needs the fix too, right now ==="
echo "This only fixes it for FUTURE merges of apply-hub-updates."
echo "main's current copy still has the stale values until you merge"
echo "the fix-slide-counts-audit PR:"
echo "  https://github.com/whiteheadlatorrey1-boop/tsm-rcm/compare/fix-slide-counts-audit?expand=1"
echo ""
echo "=== GOING FORWARD ==="
echo "apply-hub-updates has been merged into main 8 times (#91-#98) and"
echo "each merge can re-carry whatever that branch's own file state is."
echo "Safest habit: before pushing new work FROM apply-hub-updates, first"
echo "run 'git merge main' on it (or better, avoid reusing it long-term --"
echo "branch fresh off main for each new task, like fix-slide-counts-audit"
echo "did)."
