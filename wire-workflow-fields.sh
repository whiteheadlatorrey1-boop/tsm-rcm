#!/bin/bash
set -e

FILE="html/tsm-doc-search-multi.html"
TS=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=".workflow-wire-backups/$TS"
mkdir -p "$BACKUP_DIR"
cp "$FILE" "$BACKUP_DIR/tsm-doc-search-multi.html"
echo "Backed up $FILE to $BACKUP_DIR/tsm-doc-search-multi.html"

if grep -q "assignedTo: classification.suggestedTeam" "$FILE"; then
  echo "⚠️  Fix already present in $FILE — skipping, nothing changed."
  exit 0
fi

python3 << 'PYEOF'
with open("html/tsm-doc-search-multi.html", "r") as f:
    content = f.read()

anchor = """    const mission = window.TSMMissionModel.createMission({
      tenantId: 'default',
      vertical: missionVertical,
      client: classification.client || null,
      classification: classification,
      confidence: { score: classification.confidence, computedBy: 'server:doc-router' },
      validation: classification.validation || {},
      entities: classification.entities || {},
      documents: [{ fileName: classification.fileName || fileName }]
    });"""

replacement = """    const mission = window.TSMMissionModel.createMission({
      tenantId: 'default',
      vertical: missionVertical,
      client: classification.client || null,
      classification: classification,
      confidence: { score: classification.confidence, computedBy: 'server:doc-router' },
      validation: classification.validation || {},
      entities: classification.entities || {},
      workflow: {
        assignedTo: classification.suggestedTeam || null,
        queue: null,
        priority: classification.priority || 'normal',
        sla: null
      },
      documents: [{ fileName: classification.fileName || fileName }]
    });"""

count = content.count(anchor)
if count == 0:
    print("❌ Anchor not found — file may have changed since last review. Aborting, no edits made.")
    exit(1)
if count > 1:
    print(f"❌ Anchor matched {count} times, expected exactly 1 — refusing to guess. Aborting, no edits made.")
    exit(1)

content = content.replace(anchor, replacement, 1)

with open("html/tsm-doc-search-multi.html", "w") as f:
    f.write(content)

print("Patched html/tsm-doc-search-multi.html successfully.")
PYEOF

if [ $? -ne 0 ]; then
  echo "Restoring backup due to patch failure..."
  cp "$BACKUP_DIR/tsm-doc-search-multi.html" "$FILE"
  exit 1
fi

echo ""
echo "── Verifying insertion ──"
grep -n "assignedTo: classification.suggestedTeam\|priority: classification.priority" "$FILE"

echo ""
echo "── Basic syntax sanity check (node can parse the <script> block) ──"
# Extract just the JS inside <script> tags this function lives in and check
# it's not obviously broken — full HTML isn't valid JS, so we just check
# brace balance around our edit as a lightweight safety net.
python3 << 'PYEOF'
with open("html/tsm-doc-search-multi.html", "r") as f:
    content = f.read()
open_braces = content.count("{")
close_braces = content.count("}")
if open_braces != close_braces:
    print(f"⚠️  Brace mismatch detected: {open_braces} open vs {close_braces} close. Review manually before trusting this file.")
else:
    print(f"✅ Brace count balanced ({open_braces} each) — no obvious structural damage from the edit.")
PYEOF

echo ""
echo "Done. Backup of pre-patch file is at $BACKUP_DIR/tsm-doc-search-multi.html"
echo "This is a frontend file — no server restart needed, but load the page in browser and run"
echo "a real document through it to confirm mission.workflow.assignedTo / mission.workflow.priority"
echo "populate correctly (check via browser console: window.TSMMissionStore.listMissions() or similar)."
echo ""
echo "If this looks good, commit with:"
echo "  git add -A && git commit -m \"Wire suggestedTeam/priority into mission.workflow (assignedTo/priority)\""