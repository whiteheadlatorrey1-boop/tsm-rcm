#!/usr/bin/env bash
# activate-insurance-enrichment.sh
# One-shot: insert the autoEnrichSentinel('insurance') activation call into
# insurance-strategist.html, right after the existing Sentinel relay write
# and before the TSM_SENTINEL_REFRESH dispatch. Exact string match -- fails
# loudly and touches nothing if the file doesn't match what was verified.
#
# Usage:
#   ./activate-insurance-enrichment.sh [path/to/insurance-strategist.html]

set -euo pipefail

FILE="${1:-}"
if [ -z "$FILE" ]; then
  echo "No path given, searching repo for insurance-strategist.html..."
  FILE=$(find . -name "insurance-strategist.html" -not -path "*/node_modules/*" -not -path "*/backups/*" | head -1)
  if [ -z "$FILE" ]; then
    echo "ERROR: could not find insurance-strategist.html. Pass the path explicitly:"
    echo "  ./activate-insurance-enrichment.sh path/to/insurance-strategist.html"
    exit 1
  fi
  echo "Found: $FILE"
fi

if [ ! -f "$FILE" ]; then
  echo "ERROR: $FILE does not exist."
  exit 1
fi

BACKUP="${FILE}.before-enrichment-activation.$(date +%Y%m%d_%H%M%S).bak"

python3 - "$FILE" "$BACKUP" <<'PYEOF'
import sys

path, backup_path = sys.argv[1], sys.argv[2]
with open(path, 'r') as f:
    content = f.read()

if "autoEnrichSentinel" in content:
    print("ERROR: 'autoEnrichSentinel' already present in " + path + ". Refusing to apply twice.")
    print("No changes were made.")
    sys.exit(1)

OLD = """    localStorage.setItem(insSentinelKey, JSON.stringify(insSentinelExisting));
    window.dispatchEvent(new CustomEvent('TSM_SENTINEL_REFRESH'));"""

NEW = """    localStorage.setItem(insSentinelKey, JSON.stringify(insSentinelExisting));
    if (window.TSMCapabilitySweep && typeof window.TSMCapabilitySweep.autoEnrichSentinel === 'function') {
      window.TSMCapabilitySweep.autoEnrichSentinel('insurance');
    }
    window.dispatchEvent(new CustomEvent('TSM_SENTINEL_REFRESH'));"""

if OLD not in content:
    print("ERROR: exact anchor text not found in " + path + ".")
    print("This means the real file differs from the version verified in chat --")
    print("stopping rather than guessing where to insert. No changes were made.")
    sys.exit(1)

# only now that we know we WILL apply, write the backup
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
  echo "Activation NOT applied. File is untouched."
  exit 1
fi

echo ""
echo "Verifying..."
grep -n "autoEnrichSentinel\|TSM_SENTINEL_REFRESH" "$FILE"

echo ""
echo "Done. If the output above shows autoEnrichSentinel sitting between"
echo "the insSentinelKey setItem and the TSM_SENTINEL_REFRESH dispatch, it's correct."