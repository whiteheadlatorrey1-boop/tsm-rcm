#!/bin/bash
set -e

FILE="html/tsm-doc-search-multi.html"
TS=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=".tdz-fix-backups/$TS"
mkdir -p "$BACKUP_DIR"
cp "$FILE" "$BACKUP_DIR/tsm-doc-search-multi.html"
echo "Backed up $FILE to $BACKUP_DIR/tsm-doc-search-multi.html"

DECL_LINE="const GEN_PLAYBOOK_VERTICALS = new Set(['fo', 'ins', 'con', 're', 'leg', 'bpo']);"

# Already fixed? (declaration appears once, and it's before line 2212's usage)
DECL_LINE_NUM=$(grep -n "^const GEN_PLAYBOOK_VERTICALS" "$FILE" | head -1 | cut -d: -f1)
if [ -n "$DECL_LINE_NUM" ] && [ "$DECL_LINE_NUM" -lt 2000 ]; then
  echo "⚠️  Declaration already appears early (line $DECL_LINE_NUM) — looks already fixed. Skipping."
  exit 0
fi

python3 << PYEOF
with open("$FILE", "r") as f:
    lines = f.readlines()

decl = "$DECL_LINE"
anchor = "const INTERNAL_ONLY_DOC_TYPES = new Set(['ESCALATION']);"

# Find and remove the original late declaration
decl_indices = [i for i, l in enumerate(lines) if l.strip() == decl]
if len(decl_indices) != 1:
    print(f"❌ Expected exactly 1 occurrence of the declaration line, found {len(decl_indices)}. Aborting, no edits made.")
    exit(1)

anchor_indices = [i for i, l in enumerate(lines) if l.strip() == anchor]
if len(anchor_indices) != 1:
    print(f"❌ Expected exactly 1 occurrence of the anchor line, found {len(anchor_indices)}. Aborting, no edits made.")
    exit(1)

decl_idx = decl_indices[0]
anchor_idx = anchor_indices[0]

if decl_idx < anchor_idx:
    print("❌ Declaration is already before the anchor — unexpected state. Aborting, no edits made.")
    exit(1)

# Remove the late declaration line
removed_line = lines.pop(decl_idx)

# Re-find anchor index (unaffected since anchor_idx < decl_idx, indices before it unchanged)
lines.insert(anchor_idx + 1, decl + "\n")

with open("$FILE", "w") as f:
    f.writelines(lines)

print("Moved GEN_PLAYBOOK_VERTICALS declaration to just after INTERNAL_ONLY_DOC_TYPES.")
PYEOF

if [ $? -ne 0 ]; then
  echo "Restoring backup due to patch failure..."
  cp "$BACKUP_DIR/tsm-doc-search-multi.html" "$FILE"
  exit 1
fi

echo ""
echo "── Verifying new position ──"
grep -n "GEN_PLAYBOOK_VERTICALS" "$FILE"

echo ""
echo "── Brace balance sanity check ──"
python3 << 'PYEOF'
with open("html/tsm-doc-search-multi.html", "r") as f:
    content = f.read()
o = content.count("{")
c = content.count("}")
if o != c:
    print(f"⚠️  Brace mismatch: {o} open vs {c} close. Review manually.")
else:
    print(f"✅ Brace count balanced ({o} each).")
PYEOF

echo ""
echo "Done. Backup at $BACKUP_DIR/tsm-doc-search-multi.html"
echo "Hard-refresh the page in browser (Ctrl+Shift+R / Cmd+Shift+R) and re-check the console —"
echo "the ReferenceError should be gone, and a fresh document upload should now show real"
echo "workflow.assignedTo / workflow.priority values instead of null/'normal'."
echo ""
echo "If clean, commit with:"
echo "  git add -A && git commit -m \"Fix TDZ bug: move GEN_PLAYBOOK_VERTICALS declaration before first use\""