#!/usr/bin/env bash
set -euo pipefail

# Run from /workspaces/tsm-rcm in Codespaces:
#   bash fix_slide_counts.sh
#
# Audits every card's data-slides="N" in html/demo/presentation-hub.html
# against how many slide-NN.png files actually exist in its
# preview-slides/<slug>/ folder, and corrects any mismatch.
#
# WHY THIS KEEPS HAPPENING: a prior merge (PR #97, "Apply hub updates")
# was built from a stale branch and silently reverted a previous fix to
# this exact file (hotelops-demo's data-slides went from 8 back to 13).
# If your "Apply hub updates" branch/process isn't regularly rebased
# onto main, this WILL happen again. Worth checking what generates
# those branches.

FILE="html/demo/presentation-hub.html"
BASE="html/demo/preview-slides"

if [ ! -f "$FILE" ]; then
  echo "ERROR: $FILE not found. Run this from the repo root."
  exit 1
fi

echo "Making sure you're up to date with main first..."
git checkout main
git pull origin main
git checkout -b fix-slide-counts-audit

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
        print(f"  {slug}: no preview-slides folder found, leaving as-is ({declared})")
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
    print("\nCorrected:")
    for slug, old, new in changes:
        print(f"  {slug}: {old} -> {new}")
else:
    print("\nNo mismatches found -- nothing to fix.")
    raise SystemExit(42)  # signal "nothing changed" to the shell wrapper
PYEOF
PYEXIT=$?

if [ "$PYEXIT" -eq 42 ]; then
  echo "Nothing to commit."
  git checkout main
  git branch -D fix-slide-counts-audit
  exit 0
fi

git add "$FILE"
git commit -m "Fix data-slides mismatches in presentation-hub.html (audited against actual preview-slides files)"
git push origin fix-slide-counts-audit

echo ""
echo "Pushed to 'fix-slide-counts-audit'. Open/merge:"
echo "  https://github.com/whiteheadlatorrey1-boop/tsm-rcm/compare/fix-slide-counts-audit?expand=1"
