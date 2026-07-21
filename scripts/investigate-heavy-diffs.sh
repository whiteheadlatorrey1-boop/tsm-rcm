#!/bin/bash
set -e
echo "=========================================="
echo "Wiring-script check + bait-pattern scan"
echo "=========================================="

echo ""
echo "--- Does apply-enterprise-war-room-runtime-wiring.sh target Construction/FinOps/Healthcare? ---"
grep -c "construction\|finops\|healthcare" scripts/apply-enterprise-war-room-runtime-wiring.sh || echo 0
echo "First 40 lines:"
head -40 scripts/apply-enterprise-war-room-runtime-wiring.sh

echo ""
echo "--- Bait-pattern scan: hidden display:none sections in the 4 heavy-diff verticals ---"
for f in html/war-rooms/legal/legal-executive-portal.html html/war-rooms/legal/legal-strategist.html html/war-rooms/legal/legal-war-room.html \
         html/war-rooms/real-estate/real-estate-strategist.html html/war-rooms/real-estate/real-estate-executive-portal.html html/war-rooms/real-estate/real-estate-war-room.html \
         html/war-rooms/schools/schools-war-room.html html/war-rooms/schools/schools-executive-portal.html html/war-rooms/schools/schools-strategist.html \
         html/war-rooms/insurance/insurance-executive-portal.html html/war-rooms/insurance/insurance-strategist.html html/war-rooms/insurance/insurance-war-room.html; do
  COUNT=$(grep -c "display:none\|display: none" "$f" 2>/dev/null || echo 0)
  echo "$f : $COUNT display:none occurrences"
done

echo ""
echo "--- What NEW function/engine names were added (not in old versions)? Sample: Legal ---"
diff <(grep -oE "function [a-zA-Z_]+" html/legal-pro/legal-war-room.html | sort -u) \
     <(grep -oE "function [a-zA-Z_]+" html/war-rooms/legal/legal-war-room.html | sort -u) | grep "^>" | head -20

echo ""
echo "--- Sample: Insurance ---"
diff <(grep -oE "function [a-zA-Z_]+" html/tsm-insurance/insurance-war-room.html | sort -u) \
     <(grep -oE "function [a-zA-Z_]+" html/war-rooms/insurance/insurance-war-room.html | sort -u) | grep "^>" | head -20

echo ""
echo "--- Stash the Category 2 blocker so branching works ---"
git stash push -m "category-2-old-path-edits" html/finops-main-strategist.html html/healthcare/demo-executive-portal.html html/healthcare/hc-denial-war-room.html html/healthcare/hc-financial/index.html html/healthcare/hc-main-strategist.html tests/e2e/tsm-platform.spec.js
git stash list | head -3

echo ""
echo "=========================================="
echo "Paste this back."
echo "=========================================="
