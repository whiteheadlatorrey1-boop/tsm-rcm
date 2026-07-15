#!/bin/bash
set -e

echo "=============================================="
echo " TSM MORTGAGE COMMAND CENTER V5 CERTIFICATION"
echo "=============================================="

node --check server/mortgage/mortgage-command-center.js
node --check server/mortgage/mortgage-portfolio-engine.js
node --check server/mortgage/mortgage-forecast-engine.js

npx playwright test \
tests/e2e/mortgage/mortgage-command-center.spec.js


echo ""
echo "=============================================="
echo " MORTGAGE COMMAND CENTER V5 READY"
echo "=============================================="
