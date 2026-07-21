#!/bin/bash
set -e
echo "=========================================="
echo "Removing broken stub war-rooms + orphaned runtime layer"
echo "=========================================="

git checkout main -- . 2>/dev/null || true

echo "--- Deleting the 4 broken stub files (real content lives in the old paths) ---"
rm -f html/war-rooms/legal/legal-war-room.html \
      html/war-rooms/insurance/insurance-war-room.html \
      html/war-rooms/real-estate/real-estate-war-room.html \
      html/war-rooms/schools/schools-war-room.html
rm -f html/war-rooms/legal/legal-strategist.html \
      html/war-rooms/legal/legal-executive-portal.html \
      html/war-rooms/insurance/insurance-strategist.html \
      html/war-rooms/insurance/insurance-executive-portal.html \
      html/war-rooms/real-estate/real-estate-strategist.html \
      html/war-rooms/real-estate/real-estate-executive-portal.html \
      html/war-rooms/schools/schools-strategist.html \
      html/war-rooms/schools/schools-executive-portal.html

echo "--- Removing the redundant-but-harmless plain duplicates too (Construction/FinOps/Healthcare) ---"
echo "    Old files remain canonical; these add nothing yet."
rm -rf html/war-rooms/construction html/war-rooms/finops
rm -f html/war-rooms/healthcare/healthcare-war-room.html html/war-rooms/healthcare/healthcare-strategist.html html/war-rooms/healthcare/healthcare-executive-portal.html
rmdir html/war-rooms/healthcare 2>/dev/null || true
rmdir html/war-rooms/real-estate html/war-rooms/legal html/war-rooms/insurance html/war-rooms/schools 2>/dev/null || true

echo "--- Removing the non-functional runtime layer ---"
rm -rf html/shared/runtime

echo "--- Status check ---"
git status --porcelain | grep -c '^' || echo 0
echo "=========================================="
echo "Old canonical paths (legal-pro, tsm-insurance, reo-pro, schools-command,"
echo "construction-suite, finops-suite, healthcare) are untouched and remain live."
echo "=========================================="
