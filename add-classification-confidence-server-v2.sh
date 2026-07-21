#!/usr/bin/env bash
# add-classification-confidence-server.sh
# One-shot: adds confidence/reasoning/missingFields fields to the
# DOC_ROUTER_PROMPT schema in server.js. Exact string match -- fails
# loudly and touches nothing if the file doesn't match what was verified.
#
# Usage:
#   ./add-classification-confidence-server.sh [path/to/server.js]

set -euo pipefail

FILE="${1:-}"
if [ -z "$FILE" ]; then
  echo "No path given, searching repo for server.js..."
  FILE=$(find . -name "server.js" -maxdepth 2 -not -path "*/node_modules/*" -not -path "*/backups/*" | head -1)
  if [ -z "$FILE" ]; then
    echo "ERROR: could not find server.js. Pass the path explicitly:"
    echo "  ./add-classification-confidence-server.sh path/to/server.js"
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

if '"confidence": integer 0-100' in content:
    print("ERROR: confidence field already present in DOC_ROUTER_PROMPT. Refusing to apply twice.")
    print("No changes were made.")
    sys.exit(1)

# Anchor deliberately avoids the em-dash character present in the real file
# (copy/paste through chat can silently alter that byte) -- matches on the
# unambiguous ASCII text on either side of it instead.
OLD_MARKER = 'denial, dispute, or risk that should escalate to BNCA review'
FULL_OLD_LINE_END = OLD_MARKER + '\n}'

NEW_ADDITIONS = '''
  "confidence": integer 0-100 -- your confidence that documentType, verticals, and routing above are correct. Lower this for blurry/ambiguous/low-signal content, raise it for clear unambiguous matches,
  "reasoning": array of 2-4 short strings -- the specific signals in the content (keywords, structure, terminology) that drove this classification. e.g. ["Contains ICD-10 codes", "References CMS-1500 form", "Mentions denial appeal deadline"],
  "missingFields": array of short strings -- fields you would normally expect to find for this specific documentType that are NOT present in the content provided. Return [] if nothing expected is missing
}'''

if FULL_OLD_LINE_END not in content:
    print("ERROR: exact anchor text not found in " + path + ".")
    print("This means the real file differs from the version verified in chat --")
    print("stopping rather than guessing where to insert. No changes were made.")
    sys.exit(1)

if content.count(FULL_OLD_LINE_END) != 1:
    print("ERROR: anchor text found " + str(content.count(FULL_OLD_LINE_END)) + " times, expected exactly 1.")
    print("Refusing to guess which one. No changes were made.")
    sys.exit(1)

NEW_FULL = OLD_MARKER + ',' + NEW_ADDITIONS

with open(backup_path, 'w') as f:
    f.write(content)

content = content.replace(FULL_OLD_LINE_END, NEW_FULL, 1)
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
grep -n '"confidence"\|"reasoning"\|"missingFields"' "$FILE" | head -10

echo ""
echo "Done. Restart your server for the change to take effect (new prompt only"
echo "applies to classification requests made AFTER restart)."
echo ""
echo "NOTE: this changes what the Groq model is ASKED to return. The model may"
echo "occasionally omit a field despite instructions -- the client-side patch"
echo "(separate script) handles missing confidence/reasoning/missingFields"
echo "gracefully rather than assuming they're always present."
