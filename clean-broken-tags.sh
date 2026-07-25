#!/bin/bash
set -e

FILES=(
  "html/tsm-insurance/insurance-executive-portal.html"
  "html/legal-pro/legal-executive-portal.html"
  "html/healthcare/executive-portal.html"
  "html/finops-suite/finops-executive-portal.html"
  "html/construction-suite/construction-executive-portal.html"
  "html/reo-pro/re-exec-portal.html"
)

BACKUP_DIR=".broken-tag-backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "── Lines to be removed ──"
for f in "${FILES[@]}"; do
  grep -n '/html/js/core/tsm-mission-engine.js' "$f" || true
done

echo ""
echo "── Removing (backups first) ──"
for f in "${FILES[@]}"; do
  mkdir -p "$BACKUP_DIR/$(dirname "$f")"
  cp "$f" "$BACKUP_DIR/$f"
  sed -i '/\/html\/js\/core\/tsm-mission-engine\.js/d' "$f"
  echo "cleaned: $f (backup at $BACKUP_DIR/$f)"
done

echo ""
echo "── Verifying no broken references remain ──"
grep -rn '/html/js/core/tsm-mission-engine.js' "${FILES[@]}" && echo "⚠️  still present!" || echo "✅ clean"