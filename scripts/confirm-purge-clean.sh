#!/bin/bash
set -e
echo "=========================================="
echo "Confirm purge + old-path integrity"
echo "=========================================="

echo "--- shared/runtime should not exist ---"
find html/shared -maxdepth 1 2>/dev/null || echo "html/shared/ gone or empty — good"

echo ""
echo "--- war-rooms/{construction,finops,healthcare,legal,insurance,real-estate,schools} should not exist ---"
for v in construction finops healthcare legal insurance real-estate schools; do
  [ -d "html/war-rooms/$v" ] && echo "STILL EXISTS: html/war-rooms/$v" || echo "gone: $v"
done

echo ""
echo "--- Mortgage/BPO untouched? (these should still be exactly as before) ---"
ls html/war-rooms/mortgage/ html/war-rooms/bpo/

echo ""
echo "--- Old canonical files still present and untouched ---"
for f in html/legal-pro/legal-war-room.html html/tsm-insurance/insurance-war-room.html \
         html/reo-pro/re-war-room.html html/schools-command/schools-command.html \
         html/construction-suite/construction-war-room.html html/finops-suite/finops-war-room.html \
         html/healthcare/hc-denial-war-room.html; do
  [ -f "$f" ] && echo "OK: $f ($(wc -l < "$f") lines)" || echo "MISSING: $f"
done

echo ""
echo "--- Remaining pending changes count + top-level breakdown ---"
git status --porcelain | wc -l
git status --porcelain | awk '{print $1}' | sort | uniq -c

echo ""
echo "--- Stashed Category 2 files still safe? ---"
git stash list

echo "=========================================="
