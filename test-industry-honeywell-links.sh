#!/usr/bin/env bash
# test-industry-honeywell-links.sh
#
# Checks:
#   1. /music (confirm the earlier fix actually landed before moving on)
#   2. Every Industry Track link on the Platform Hub (Healthcare, FinOps,
#      Insurance, Construction, Legal, Real Estate, BPO x3, Mortgage x3)
#   3. The 3 Honeywell incident scenario cards
#
# Usage:
#   ./test-industry-honeywell-links.sh                  # defaults to localhost:8080
#   ./test-industry-honeywell-links.sh https://tsm-consultz.fly.dev

set -uo pipefail

BASE_URL="${1:-http://localhost:8080}"
FAIL_COUNT=0
TOTAL=0

echo "Testing against: $BASE_URL"
echo "================================================================"

# ---------------------------------------------------------------------------
# Step 1: Confirm /music specifically, with body preview (not just status) —
# this is the one that had a real ENOENT error underneath a 500 last time.
# ---------------------------------------------------------------------------
echo ""
echo "-- /music (confirm previous fix actually landed) --"
music_code=$(curl -s -o /tmp/music_body.txt -w "%{http_code}" "${BASE_URL}/music")
music_body=$(cat /tmp/music_body.txt 2>/dev/null | head -c 300)
if [ "$music_code" = "200" ]; then
  echo "✅ 200  /music"
else
  echo "❌ $music_code  /music"
  echo "   body preview: $music_body"
fi
rm -f /tmp/music_body.txt

# ---------------------------------------------------------------------------
# Step 2: Industry Track links
# ---------------------------------------------------------------------------
echo ""
echo "-- Industry Track --"

industry_paths=(
  "/html/healthcare/hc-denial-war-room.html"
  "/html/finops-suite/finops-war-room.html"
  "/html/tsm-insurance/insurance-war-room.html"
  "/html/construction-suite/construction-war-room.html"
  "/html/legal-pro/legal-war-room.html"
  "/html/reo-pro/re-war-room.html"
  "/html/war-rooms/bpo/bpo-war-room.html"
  "/html/war-rooms/bpo/bpo-strategist.html"
  "/html/war-rooms/bpo/bpo-executive-portal.html"
  "/html/war-rooms/mortgage/mortgage-war-room.html"
  "/html/war-rooms/mortgage/mortgage-strategist.html"
  "/html/war-rooms/mortgage/mortgage-executive-portal.html"
)

for path in "${industry_paths[@]}"; do
  TOTAL=$((TOTAL+1))
  code=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${path}")
  if [ "$code" = "200" ]; then
    echo "✅ $code  $path"
  else
    echo "❌ $code  $path"
    FAIL_COUNT=$((FAIL_COUNT+1))
  fi
done

# ---------------------------------------------------------------------------
# Step 3: Honeywell incident scenario cards
# ---------------------------------------------------------------------------
echo ""
echo "-- Honeywell Incident Scenarios --"

honeywell_paths=(
  "/html/plant-incident.html"
  "/html/cyber-incident.html"
  "/html/supplier-shutdown.html"
)

for path in "${honeywell_paths[@]}"; do
  TOTAL=$((TOTAL+1))
  code=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${path}")
  if [ "$code" = "200" ]; then
    echo "✅ $code  $path"
  else
    echo "❌ $code  $path"
    FAIL_COUNT=$((FAIL_COUNT+1))
  fi
done

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "================================================================"
if [ "$music_code" != "200" ]; then
  FAIL_COUNT=$((FAIL_COUNT+1))
fi
TOTAL=$((TOTAL+1))

if [ "$FAIL_COUNT" -eq 0 ]; then
  echo "✅ All $TOTAL links returned 200."
else
  echo "❌ $FAIL_COUNT of $TOTAL links failed. Scroll up for details."
fi
echo ""
echo "Reminder: a 200 status only confirms the file loads — it does NOT catch"
echo "JavaScript console errors. Open each of these manually in a browser tab,"
echo "hit F12 → Console, and click through the actual UI before calling any"
echo "single one demo-ready."
