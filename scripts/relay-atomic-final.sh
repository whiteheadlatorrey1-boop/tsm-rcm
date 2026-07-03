#!/usr/bin/env bash
set -euo pipefail

ROOT="html/war-rooms"
BACKUP="backup_relay_atomic_$(date +%s)"
REPORT="relay_atomic_report_$(date +%s).txt"

echo "======================================"
echo "TSM ATOMIC RELAY RECONCILER"
echo "Canonical rewrite engine (FINAL PASS)"
echo "======================================"

mkdir -p "$BACKUP"
cp -r "$ROOT" "$BACKUP"

echo "[1/5] Building canonical relay registry..."

# Extract all valid relay keys first (normalize them in memory)
RAW_KEYS=$(grep -Rho "TSM_[A-Z0-9-]*_RELAY" "$ROOT" || true)

CANON_KEYS=$(echo "$RAW_KEYS" | sed 's/-/_/g' | sort -u)

echo "Canonical Relay Keys:"
echo "$CANON_KEYS"
echo ""

echo "[2/5] Fixing malformed fragments (critical cleanup)..."

# Fix broken string artifacts like CRM_RELAY";
find "$ROOT" -type f -name "*.html" -o -name "*.js" | while read -r f; do

  perl -i -pe '
    s/TSM_([A-Z0-9_-]*)_RELAY["\;]+/TSM_$1_RELAY/g;
    s/RELAY_KEY\s*=\s*["\;]//g;
  ' "$f"

done

echo "[3/5] Enforcing canonical relay naming..."

for key in $CANON_KEYS; do
  find "$ROOT" -type f -exec perl -i -pe "
    s/${key//_/[-_]}/${key}/g;
  " {} \;
done

echo "[4/5] Validating runtime consistency..."

echo ""
echo "=== HYBRID / INVALID PATTERNS ==="
INVALID=$(grep -R "TSM_.*-.*_RELAY" "$ROOT" || true)

if [[ -z "$INVALID" ]]; then
  echo "NO HYBRID KEYS FOUND"
else
  echo "$INVALID"
fi

echo ""
echo "=== FINAL RUNTIME KEYS ==="
grep -Rho "TSM_[A-Z0-9_]*_RELAY" "$ROOT" | sort -u

echo "[5/5] Generating final audit report..."

{
echo "TSM ATOMIC RELAY REPORT"
echo "========================"
echo ""
echo "CANONICAL KEYS:"
echo "$CANON_KEYS"
echo ""
echo "INVALID REMNANTS:"
echo "${INVALID:-NONE}"
} > "$REPORT"

echo ""
echo "======================================"
echo "COMPLETE ATOMIC RECONCILIATION DONE"
echo "Backup: $BACKUP"
echo "Report: $REPORT"
echo "======================================"