#!/usr/bin/env bash
# activate-finops-enrichment.sh
# One-shot: FinOps did NOT load the shared tsm-capability-sweep.js module at
# all, unlike the other 4 verticals. This script:
#   1. Adds the missing <script src="/shared/tsm-capability-sweep.js"></script>
#      tag (same absolute path already proven working in Insurance,
#      Healthcare, RE, and Construction), right after the existing
#      tsm-kernel.js tag.
#   2. Inserts the autoEnrichSentinel('finops') activation call inside the
#      Sentinel push block, right after the localStorage.setItem and before
#      the TSM_SENTINEL_REFRESH dispatch.
# Exact string match on both -- fails loudly and touches nothing if the file
# doesn't match what was verified.
#
# Usage:
#   ./activate-finops-enrichment.sh [path/to/finops-main-strategist.html]

set -euo pipefail

FILE="${1:-}"
if [ -z "$FILE" ]; then
  echo "No path given, searching repo for finops-main-strategist.html..."
  FILE=$(find . -name "finops-main-strategist.html" -not -path "*/node_modules/*" -not -path "*/backups/*" | head -1)
  if [ -z "$FILE" ]; then
    echo "ERROR: could not find finops-main-strategist.html. Pass the path explicitly:"
    echo "  ./activate-finops-enrichment.sh path/to/finops-main-strategist.html"
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

SCRIPT_TAG_OLD = '<script src="/html/core/tsm-kernel.js"></script>'
SCRIPT_TAG_NEW = '<script src="/html/core/tsm-kernel.js"></script>\n<script src="/shared/tsm-capability-sweep.js"></script>'

CALL_OLD = """        const finRelay = { generatedAt: new Date().toISOString(), anomalies: [finAnomaly] };
        localStorage.setItem('TSM_FINOPS_STRATEGIST_RELAY', JSON.stringify(finRelay));
        window.dispatchEvent(new Event('TSM_SENTINEL_REFRESH'));"""

CALL_NEW = """        const finRelay = { generatedAt: new Date().toISOString(), anomalies: [finAnomaly] };
        localStorage.setItem('TSM_FINOPS_STRATEGIST_RELAY', JSON.stringify(finRelay));
        if (window.TSMCapabilitySweep && typeof window.TSMCapabilitySweep.autoEnrichSentinel === 'function') {
          window.TSMCapabilitySweep.autoEnrichSentinel('finops');
        }
        window.dispatchEvent(new Event('TSM_SENTINEL_REFRESH'));"""

missing = []
if SCRIPT_TAG_OLD not in content:
    missing.append("script tag anchor (<script src=\"/html/core/tsm-kernel.js\"></script>)")
if CALL_OLD not in content:
    missing.append("Sentinel push anchor (finRelay / localStorage.setItem / dispatchEvent block)")

if missing:
    print("ERROR: the following exact anchor(s) were not found in " + path + ":")
    for m in missing:
        print("  - " + m)
    print("This means the real file differs from the version verified in chat --")
    print("stopping rather than guessing where to insert. No changes were made.")
    sys.exit(1)

with open(backup_path, 'w') as f:
    f.write(content)

content = content.replace(SCRIPT_TAG_OLD, SCRIPT_TAG_NEW, 1)
content = content.replace(CALL_OLD, CALL_NEW, 1)

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
grep -n "tsm-capability-sweep\|autoEnrichSentinel\|TSM_FINOPS_STRATEGIST_RELAY\|TSM_SENTINEL_REFRESH" "$FILE"

echo ""
echo "Done. Check above that:"
echo "  1. The /shared/tsm-capability-sweep.js script tag was added"
echo "  2. autoEnrichSentinel sits between the finRelay setItem and dispatchEvent"
echo ""
echo "NOTE: unlike the other 4 verticals, this module load was NOT previously"
echo "confirmed to work in the browser for this specific file (different script"
echo "tag path convention was in use here). The typeof guard means nothing breaks"
echo "if the path is wrong -- it just silently won't enrich. Worth opening"
echo "finops-main-strategist.html in the browser and checking the console for"
echo "a 404 on tsm-capability-sweep.js to be fully sure."