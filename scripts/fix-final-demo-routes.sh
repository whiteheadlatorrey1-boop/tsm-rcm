#!/bin/bash

set -e

echo "=========================================="
echo "TSM FINAL DEMO ROUTE REPAIR"
echo "=========================================="

FILE="tests/e2e/tsm-platform.spec.js"

cp "$FILE" \
"backups/platform-one-shot/tsm-platform.spec.final.$(date +%Y%m%d_%H%M%S)"


echo "Updating final routes..."


sed -i \
"s#/html/music/music-command-center.html#/html/music-command/academy/music-business.html#g" \
"$FILE"


sed -i \
"s#/html/sweet-os/index.html#/html/music-command/js/sweet-music-engine.js#g" \
"$FILE"


sed -i \
"s#/html/demo/honeywell-demo.html#/html/war-rooms/honeywell-executive-portal.html#g" \
"$FILE"


echo ""
echo "Verifying..."

grep -n "music\|sweet\|honeywell" "$FILE"


echo ""
echo "Cleaning artifacts..."

rm -rf test-results
rm -rf playwright-report


echo ""
echo "Running E2E..."

npm run test:e2e

