#!/bin/bash
set -e

echo "=========================================="
echo "Migration Intent + Live-Path Check"
echo "=========================================="
echo ""

echo "--- migrate-existing-war-rooms.sh: what was it supposed to do? ---"
cat scripts/migrate-existing-war-rooms.sh
echo ""

echo "--- Does the migration report mention deleting/redirecting old paths? ---"
grep -A5 -i "delete\|redirect\|old path\|cleanup\|remove" scripts/migrate-existing-war-rooms.sh || echo "No delete/redirect logic found in script"
echo ""

echo "--- Which copy does nav actually point to? (tsm-doc-search-multi.html) ---"
echo "OLD-style references:"
grep -c "construction-suite\|legal-pro\|tsm-insurance\|reo-pro\|healthcare/hc-\|finops-main-strategist" html/tsm-doc-search-multi.html 2>/dev/null || echo 0
echo "NEW-style references (war-rooms/<vertical>):"
grep -c "war-rooms/construction\|war-rooms/legal\|war-rooms/insurance\|war-rooms/real-estate\|war-rooms/healthcare\|war-rooms/finops" html/tsm-doc-search-multi.html 2>/dev/null || echo 0
echo ""

echo "--- Same check against the platform hub (if it exists) ---"
for f in html/tsm-platform-hub.html html/hub/index.html; do
  if [ -f "$f" ]; then
    echo "## $f"
    echo "OLD-style: $(grep -c 'construction-suite\|legal-pro\|tsm-insurance\|reo-pro\|healthcare/hc-\|finops-main-strategist' "$f" 2>/dev/null || echo 0)"
    echo "NEW-style: $(grep -c 'war-rooms/construction\|war-rooms/legal\|war-rooms/insurance\|war-rooms/real-estate\|war-rooms/healthcare\|war-rooms/finops' "$f" 2>/dev/null || echo 0)"
  fi
done
echo ""

echo "--- Does the capability-coverage spec (already fixed for Mortgage) point old or new? ---"
grep -B2 -A5 "column: 'Legal'\|column: 'Healthcare'\|column: 'FinOps'" tests/e2e/enterprise-capability-coverage.spec.js
echo ""

echo "--- Full migration report, if one exists ---"
find reports/ -iname "*migrat*" 2>/dev/null
echo ""

echo "=========================================="
echo "Paste this back before we decide what to commit."
echo "=========================================="