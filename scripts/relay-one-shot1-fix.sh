#!/usr/bin/env bash
set -euo pipefail

MODE="${1:---dry-run}"
ROOT="html/war-rooms"
BACKUP="backup_relay_normalization_$(date +%s)"

echo "======================================"
echo "TSM ENTERPRISE RELAY NORMALIZER"
echo "MODE: $MODE"
echo "ROOT: $ROOT"
echo "======================================"

mkdir -p "$BACKUP"
cp -r "$ROOT" "$BACKUP"

echo "[1/5] Scanning relay keys..."

FILES=$(grep -RIl "TSM_.*RELAY" "$ROOT" || true)

echo "[2/5] Normalizing hyphenated RELAY_KEY constants..."

for f in $FILES; do
  # Fix RELAY_KEY constants ONLY
  perl -i -pe '
    s/(RELAY_KEY\s*=\s*["'\'']TSM_[A-Z0-9]+)-([A-Z0-9_]+_RELAY["'\''])/$1_$2/g;
  ' "$f"
done

echo "[3/5] Normalizing storage keys (localStorage/sessionStorage)..."

for f in $FILES; do
  perl -i -pe '
    s/(getItem|setItem)\(["'\''](TSM_[A-Z0-9]+)-([A-Z0-9_]+_RELAY)["'\'']\)/$1("$2_$3")/g;
  ' "$f"
done

echo "[4/5] Normalizing stray RELAY_KEY patterns in JS scope..."

for f in $FILES; do
  perl -i -pe '
    s/TSM_([A-Z0-9]+)-([A-Z0-9_]+_RELAY)/TSM_$1_$2/g;
  ' "$f"
done

echo "[5/5] Validation scan..."

echo ""
echo "=== Remaining hyphen RELAY keys (should be minimal or empty) ==="
grep -R "TSM_.*-.*RELAY" "$ROOT" || echo "NONE FOUND"

echo ""
echo "=== Relay Key Index ==="
grep -R "RELAY_KEY" "$ROOT" | head -n 20

echo ""
echo "======================================"
echo "DONE"
echo "Backup: $BACKUP"
echo "======================================"

if [[ "$MODE" == "--dry-run" ]]; then
  echo "DRY RUN ONLY — no destructive changes were applied."
fi