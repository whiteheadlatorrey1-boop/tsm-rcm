#!/bin/bash
set -e

echo "=============================================="
echo " TSM MORTGAGE NETWORK INTELLIGENCE V6 CERT"
echo "=============================================="


node --check server/mortgage/mortgage-market-intelligence.js
node --check server/mortgage/mortgage-rate-engine.js
node --check server/mortgage/mortgage-capacity-engine.js
node --check server/mortgage/mortgage-branch-benchmark.js
node --check server/mortgage/mortgage-investor-engine.js
node --check server/mortgage/mortgage-ai-advisor.js


npx playwright test \
tests/e2e/mortgage/mortgage-network-intelligence.spec.js


echo ""
echo "=============================================="
echo " MORTGAGE NETWORK INTELLIGENCE V6 READY"
echo "=============================================="
