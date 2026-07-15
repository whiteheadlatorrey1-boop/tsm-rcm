#!/bin/bash
set -e

echo "=============================================="
echo " TSM MORTGAGE AUTONOMOUS MARKETPLACE V8 CERT"
echo "=============================================="


for f in \
server/mortgage/mortgage-marketplace-engine.js \
server/mortgage/mortgage-ai-matching-engine.js \
server/mortgage/mortgage-capital-market-engine.js \
server/mortgage/mortgage-loan-trading-engine.js \
server/mortgage/mortgage-partner-scoring.js \
server/mortgage/mortgage-autonomous-negotiation.js \
server/mortgage/mortgage-enterprise-memory.js

do

node --check $f

done


npx playwright test \
tests/e2e/mortgage/mortgage-autonomous-marketplace.spec.js


echo ""

echo "=============================================="
echo " MORTGAGE AUTONOMOUS MARKETPLACE V8 READY"
echo "=============================================="
