#!/bin/bash
set -e


echo "=============================================="
echo " TSM MORTGAGE DIGITAL ECOSYSTEM V7 CERT"
echo "=============================================="


for f in \
server/mortgage/mortgage-borrower-portal.js \
server/mortgage/mortgage-broker-engine.js \
server/mortgage/mortgage-partner-network.js \
server/mortgage/mortgage-vendor-management.js \
server/mortgage/mortgage-document-exchange.js \
server/mortgage/mortgage-servicing-intelligence.js

do

node --check $f

done


npx playwright test \
tests/e2e/mortgage/mortgage-digital-ecosystem.spec.js


echo ""

echo "=============================================="
echo " MORTGAGE DIGITAL ECOSYSTEM V7 READY"
echo "=============================================="

