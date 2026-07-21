#!/usr/bin/env bash
# add-classification-confidence-client.sh
# One-shot: adds a confidence badge + missing-fields warning to the upload
# status line in tsm-doc-search-multi.html, right where classification
# results are currently rendered. Gracefully handles the case where the
# model omits confidence/reasoning/missingFields (doesn't assume they're
# always present). Exact string match -- fails loudly and touches nothing
# if the file doesn't match what was verified.
#
# Usage:
#   ./add-classification-confidence-client.sh [path/to/tsm-doc-search-multi.html]

set -euo pipefail

FILE="${1:-}"
if [ -z "$FILE" ]; then
  echo "No path given, searching repo for tsm-doc-search-multi.html..."
  FILE=$(find . -name "tsm-doc-search-multi.html" -not -path "*/backups/*" | head -1)
  if [ -z "$FILE" ]; then
    echo "ERROR: could not find tsm-doc-search-multi.html. Pass the path explicitly:"
    echo "  ./add-classification-confidence-client.sh path/to/tsm-doc-search-multi.html"
    exit 1
  fi
  echo "Found: $FILE"
fi

if [ ! -f "$FILE" ]; then
  echo "ERROR: $FILE does not exist."
  exit 1
fi

BACKUP="${FILE}.before-classification-confidence.$(date +%Y%m%d_%H%M%S).bak"

python3 - "$FILE" "$BACKUP" <<'PYEOF'
import sys

path, backup_path = sys.argv[1], sys.argv[2]
with open(path, 'r') as f:
    content = f.read()

if 'confBadge' in content:
    print("ERROR: confidence display already present. Refusing to apply twice.")
    print("No changes were made.")
    sys.exit(1)

OLD = '''    const warRoomBtns = getWarRoomButtons(classification);

    uqStatus(qid, `${classification.documentType || "Routed"} → ${badges}${attNote}${warRoomBtns ? '<br><span style="font-size:8px;color:var(--dim);margin-right:4px;">OPEN IN:</span>' + warRoomBtns : ''}`, "ok");'''

NEW = '''    const warRoomBtns = getWarRoomButtons(classification);

    // Confidence badge -- gracefully handles the model omitting this field
    const confBadge = classification.confidence != null
      ? `<span style="font-size:9px;color:${classification.confidence >= 80 ? '#1ee8b6' : classification.confidence >= 50 ? '#f8b73f' : '#f87171'};"> · ${classification.confidence}% confidence</span>`
      : '';
    const missingBadge = (classification.missingFields && classification.missingFields.length)
      ? `<br><span style="font-size:8px;color:#f87171;">⚠ Missing: ${classification.missingFields.map(f => String(f).replace(/</g,'&lt;')).join(', ')}</span>`
      : '';
    const reasoningBadge = (classification.reasoning && classification.reasoning.length)
      ? `<br><span style="font-size:8px;color:var(--dim);">Why: ${classification.reasoning.map(r => String(r).replace(/</g,'&lt;')).join(' · ')}</span>`
      : '';

    uqStatus(qid, `${classification.documentType || "Routed"} → ${badges}${confBadge}${attNote}${warRoomBtns ? '<br><span style="font-size:8px;color:var(--dim);margin-right:4px;">OPEN IN:</span>' + warRoomBtns : ''}${missingBadge}${reasoningBadge}`, "ok");'''

if OLD not in content:
    print("ERROR: exact anchor text not found in " + path + ".")
    print("This means the real file differs from the version verified in chat --")
    print("stopping rather than guessing where to insert. No changes were made.")
    sys.exit(1)

with open(backup_path, 'w') as f:
    f.write(content)

content = content.replace(OLD, NEW, 1)
with open(path, 'w') as f:
    f.write(content)

print("Backed up original to: " + backup_path)
print("Patch applied successfully to " + path)
PYEOF

STATUS=$?
if [ "$STATUS" -ne 0 ]; then
  echo "Patch NOT applied. File is untouched."
  exit 1
fi

echo ""
echo "Verifying..."
grep -n "confBadge\|missingBadge\|reasoningBadge" "$FILE"

echo ""
echo "Done. This only takes effect for NEW uploads after the server-side prompt"
echo "change is also applied and the server is restarted -- until then, the"
echo "model won't be returning confidence/reasoning/missingFields, so these"
echo "badges will simply not render (safe no-op), not error."