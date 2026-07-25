#!/usr/bin/env bash
set -euo pipefail

ROOT="html/war-rooms"
BACKUP="backup_relay_final_$(date +%s)"

echo "======================================"
echo "TSM FINAL RELAY RECONCILIATION ENGINE"
echo "Enterprise-grade drift correction pass"
echo "======================================"

mkdir -p "$BACKUP"
cp -r "$ROOT" "$BACKUP"

echo "[1/6] Collecting relay key inventory..."

ALL_KEYS=$(grep -Rho "TSM_[A-Z0-9-]*_RELAY" "$ROOT" || true)

echo ""
echo "Detected raw relay keys:"
echo "$ALL_KEYS" | sort -u
echo ""

echo "[2/6] Normalizing ONLY JS/storage relay contracts..."

# Fix ONLY JS + storage contexts
find "$ROOT" -type f \( -name "*.js" -o -name "*.html" \) | while read -r file; do

  # 1. Fix storage calls ONLY
  perl -i -pe '
    s/(getItem|setItem)\(["'\''](TSM_[A-Z0-9]+)-([A-Z0-9_-]*_RELAY)["'\'']\)/$1("$2_$3")/g;
  ' "$file"

  # 2. Fix RELAY_KEY constants ONLY
  perl -i -pe '
    s/(RELAY_KEY\s*=\s*["'\'']TSM_[A-Z0-9]+)-([A-Z0-9_-]*_RELAY["'\''])/$1_$2/g;
  ' "$file"

done

echo "[3/6] Normalizing cross-portal relay references..."

for file in $(grep -RIl "RELAY_KEY" "$ROOT"); do
  perl -i -pe '
    s/TSM_([A-Z0-9]+)-([A-Z0-9_-]*_RELAY)/TSM_$1_$2/g;
  ' "$file"
done

echo "[4/6] VALIDATING runtime-only relay keys..."

echo ""
echo "=== VALID RUNTIME KEYS ==="
grep -Rho "TSM_[A-Z0-9_]*_RELAY" "$ROOT" | sort -u || true

echo ""
echo "=== CHECKING HYBRID DRIFT (should be empty) ==="
DRIFT=$(grep -R "TSM_.*-.*_RELAY" "$ROOT" || true)

if [[ -z "$DRIFT" ]]; then
  echo "NO DRIFT FOUND"
else
  echo "$DRIFT"
fi

echo "[5/6] Checking UI layer safety (non-invasive scan only)..."

echo ""
echo "UI layer scan (NO MODIFICATIONS):"
grep -R "RELAY TO STRATEGIST" "$ROOT" | head -n 10 || true

echo "[6/6] Generating enterprise reconciliation report..."

REPORT="relay_reconciliation_report_$(date +%s).txt"

{
echo "TSM RELAY FINAL REPORT"
echo "======================="
echo ""
echo "BACKUP: $BACKUP"
echo ""
echo "FINAL VALID KEYS:"
grep -Rho "TSM_[A-Z0-9_]*_RELAY" "$ROOT" | sort -u
echo ""
echo "DRIFT (should be empty):"
grep -R "TSM_.*-.*_RELAY" "$ROOT" || echo "NONE"
} > "$REPORT"

echo ""
echo "======================================"
echo "COMPLETE"
echo "Backup: $BACKUP"
echo "Report: $REPORT"
echo "======================================"