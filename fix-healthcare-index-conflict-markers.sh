#!/usr/bin/env bash
# fix-healthcare-index-conflict-markers.sh
#
# Removes literal, unresolved merge-conflict markers that were accidentally
# committed directly into html/healthcare/index.html (lines 356-377) at some
# point in this file's history, and have been sitting live in the file ever
# since (confirmed: not a live git conflict, since `git status` shows this
# file as clean/unmerged-free -- the markers themselves are committed text).
#
# The conflict wraps a duplicate INLINED copy of DOMAIN_COLORS,
# WORKFLOW_STAGES, and NODE_MAP -- constants that are already fully defined
# and used by html/healthcare/mission-panel.js, which this same page loads
# externally via <script src="/healthcare/mission-panel.js"> later on
# (confirmed: no reference to these constant names anywhere else in
# index.html outside this dead block). Safe to delete entirely, no
# functionality lost.
#
# Usage:
#   bash fix-healthcare-index-conflict-markers.sh
#
# Run this from the repo root (/workspaces/TSM-Consultz-).

set -euo pipefail

TARGET="html/healthcare/index.html"

if [ ! -f "$TARGET" ]; then
  echo "ERROR: $TARGET not found." >&2
  echo "Run this script from the repo root (/workspaces/TSM-Consultz-)." >&2
  exit 1
fi

echo "== Backing up $TARGET =="
cp "$TARGET" "$TARGET.bak"
echo "  backup written as $TARGET.bak"

echo "== Removing dead inlined block + conflict markers =="
if ! grep -q "^<<<<<<< Updated upstream$" "$TARGET"; then
  echo "  no conflict markers found — already fixed or file has changed, skipping"
else
  python3 - <<'PYEOF'
path = "html/healthcare/index.html"
with open(path, "r") as f:
    content = f.read()

old = '''<!-- ═══════════════════════════════════════════════════
<<<<<<< Updated upstream
     INLINED: mission-panel.js
═══════════════════════════════════════════════════ -->
<script>
const DOMAIN_COLORS = {
  billing:"#00c896",denials:"#e84040",coding:"#00aaff",medical:"#00ffc6",payments:"#ffc400",ar:"#b56cff",
  operations:"#00aaff",compliance:"#ff4d6d",insurance:"#00aaff",pharmacy:"#ffc400",financial:"#00aaff",
  legal:"#b56cff",vendors:"#ff7a00",taxprep:"#d86cff",grants:"#4aa3ff"
};
const WORKFLOW_STAGES = ["INTAKE","REVIEW","ACTION","CLOSE"];
const NODE_MAP = {
  "billing-queue":"billing","credentialing":"billing","denial-lab":"compliance","coding-review":"medical",
  "ar-followup":"billing","medical-node":"medical","insurance-node":"insurance","operations-node":"operations",
  "pharmacy-node":"pharmacy","financial-node":"financial","legal-node":"legal","vendors-node":"vendors",
  "taxprep-node":"taxprep","grants-node":"grants"
};

</script>

<!-- ═══════════════════════════════════════════════════
=======
>>>>>>> Stashed changes
     NODE GRID'''

new = '''<!-- ═══════════════════════════════════════════════════
     NODE GRID'''

if old not in content:
    raise SystemExit("Expected block not found — file may have changed. Aborting without writing.")

content = content.replace(old, new, 1)
with open(path, "w") as f:
    f.write(content)

print("  applied")
PYEOF
fi

echo
echo "== Verify: no conflict markers remain =="
if grep -n "^<<<<<<<\|^=======\|^>>>>>>>" "$TARGET"; then
  echo "  WARNING: markers still present — review manually" >&2
else
  echo "  clean"
fi

echo
echo "== Done =="
echo "Review the diff with:"
echo "  git diff $TARGET"
echo
echo "This should go on its own branch — it's an unrelated pre-existing repo"
echo "hygiene bug, not part of the healthcare/e2e fixes on the current branch:"
echo "  git checkout main"
echo "  git pull origin main"
echo "  git checkout -b fix/healthcare-index-committed-conflict-markers"
echo "  git add $TARGET"
echo "  git commit -m 'Remove unresolved merge-conflict markers accidentally committed to healthcare/index.html'"
echo "  git push -u origin fix/healthcare-index-committed-conflict-markers"
echo
echo "Once confirmed, delete the backup:"
echo "  rm $TARGET.bak"