#!/bin/bash
set -e
echo "=========================================="
echo "Cutover Readiness: Parity + Wiring"
echo "=========================================="

declare -A OLD_NEW=(
  ["html/construction-suite/construction-war-room.html"]="html/war-rooms/construction/construction-war-room.html"
  ["html/construction-suite/construction-strategist.html"]="html/war-rooms/construction/construction-strategist.html"
  ["html/construction-suite/construction-executive-portal.html"]="html/war-rooms/construction/construction-executive-portal.html"
  ["html/healthcare/hc-denial-war-room.html"]="html/war-rooms/healthcare/healthcare-war-room.html"
  ["html/healthcare/hc-main-strategist.html"]="html/war-rooms/healthcare/healthcare-strategist.html"
  ["html/healthcare/executive-portal.html"]="html/war-rooms/healthcare/healthcare-executive-portal.html"
  ["html/finops-suite/finops-war-room.html"]="html/war-rooms/finops/finops-war-room.html"
  ["html/finops-suite/finops-main-strategist.html"]="html/war-rooms/finops/finops-strategist.html"
  ["html/finops-suite/finops-executive-portal.html"]="html/war-rooms/finops/finops-executive-portal.html"
  ["html/reo-pro/re-war-room.html"]="html/war-rooms/real-estate/real-estate-war-room.html"
  ["html/reo-pro/re-strategist.html"]="html/war-rooms/real-estate/real-estate-strategist.html"
  ["html/reo-pro/re-exec-portal.html"]="html/war-rooms/real-estate/real-estate-executive-portal.html"
  ["html/legal-pro/legal-war-room.html"]="html/war-rooms/legal/legal-war-room.html"
  ["html/legal-pro/legal-main-strategist.html"]="html/war-rooms/legal/legal-strategist.html"
  ["html/legal-pro/legal-executive-portal.html"]="html/war-rooms/legal/legal-executive-portal.html"
  ["html/tsm-insurance/insurance-war-room.html"]="html/war-rooms/insurance/insurance-war-room.html"
  ["html/tsm-insurance/insurance-strategist.html"]="html/war-rooms/insurance/insurance-strategist.html"
  ["html/tsm-insurance/insurance-executive-portal.html"]="html/war-rooms/insurance/insurance-executive-portal.html"
  ["html/schools-command/schools-command.html"]="html/war-rooms/schools/schools-war-room.html"
  ["html/schools-command/schools-strategist.html"]="html/war-rooms/schools/schools-strategist.html"
  ["html/schools-command/schools-executive-portal.html"]="html/war-rooms/schools/schools-executive-portal.html"
)

echo ""
echo "--- PARITY: byte-identical? (if not, new copy may be stale OR pre-enriched) ---"
for old in "${!OLD_NEW[@]}"; do
  new="${OLD_NEW[$old]}"
  if [ ! -f "$new" ]; then
    echo "MISSING NEW: $new"
    continue
  fi
  if cmp -s "$old" "$new"; then
    echo "IDENTICAL   : $new"
  else
    LINES=$(diff "$old" "$new" | grep -c '^[<>]' || true)
    echo "DIFFERS ($LINES lines): $old vs $new"
  fi
done

echo ""
echo "--- WIRING: does the NEW copy reference shared/runtime/enterprise? ---"
for new in "${OLD_NEW[@]}"; do
  if [ -f "$new" ]; then
    if grep -q "shared/runtime/enterprise" "$new"; then
      echo "WIRED   : $new"
    else
      echo "NOT WIRED: $new"
    fi
  fi
done

echo ""
echo "--- node --check every new .html's inline scripts is out of scope; run demo-certify separately ---"
echo "=========================================="
echo "Paste this back — it decides Phase 3 order."
echo "=========================================="
