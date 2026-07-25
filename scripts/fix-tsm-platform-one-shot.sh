#!/bin/bash

set -e

echo "=========================================="
echo "TSM PLATFORM ONE-SHOT ROUTE + E2E REPAIR"
echo "=========================================="

FILE="tests/e2e/tsm-platform.spec.js"

if [ ! -f "$FILE" ]; then
  echo "Missing $FILE"
  exit 1
fi


echo ""
echo "1. Creating backup..."

mkdir -p backups/platform-one-shot

cp "$FILE" \
"backups/platform-one-shot/tsm-platform.spec.js.$(date +%Y%m%d_%H%M%S)"


echo ""
echo "2. Repairing stale routes..."


declare -A ROUTE_MAP=(

["/html/war-rooms/healthcare/hc-war-room.html"]="/html/healthcare/hc-denial-war-room.html"

["/html/war-rooms/healthcare/hc-strategist.html"]="/html/healthcare/hc-main-strategist.html"

["/html/war-rooms/healthcare/hc-executive-portal.html"]="/html/healthcare/executive-portal.html"

["/html/war-rooms/html/war-rooms/bpo/bpo-strategist.html"]="/html/war-rooms/bpo/bpo-strategist.html"

["/html/music/music-command-center.html"]="/html/music/music-command.html"

["/html/sweet-os/index.html"]="/html/sweet-os/sweet-os.html"

["/html/demo/honeywell-demo.html"]="/html/demo/honeywell/honeywell-demo.html"

)


for OLD in "${!ROUTE_MAP[@]}"
do

NEW="${ROUTE_MAP[$OLD]}"

sed -i "s#$OLD#$NEW#g" "$FILE"

echo "FIXED:"
echo " $OLD"
echo " -> $NEW"

done


echo ""
echo "3. Validating route targets..."


ROUTES=(

"/html/healthcare/hc-denial-war-room.html"

"/html/healthcare/hc-main-strategist.html"

"/html/healthcare/executive-portal.html"

"/html/war-rooms/bpo/bpo-strategist.html"

"/html/music/music-command.html"

"/html/sweet-os/sweet-os.html"

"/html/demo/honeywell/honeywell-demo.html"

)


FAILED=0


for ROUTE in "${ROUTES[@]}"
do

if [ -f ".$ROUTE" ]; then

echo "PASS $ROUTE"

else

echo "MISSING $ROUTE"

FAILED=1

fi

done


if [ $FAILED -eq 1 ]; then

echo ""
echo "Route validation failed."
echo "Fix missing files before continuing."

exit 1

fi


echo ""
echo "4. Cleaning Playwright artifacts..."

rm -rf test-results
rm -rf playwright-report


echo ""
echo "5. Listing tests..."

npx playwright test --list


echo ""
echo "6. Running Enterprise E2E validation..."

npm run test:e2e


echo ""
echo "=========================================="
echo "TSM PLATFORM VALIDATION COMPLETE"
echo "=========================================="
