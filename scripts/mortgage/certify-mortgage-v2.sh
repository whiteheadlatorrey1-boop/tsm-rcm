#!/bin/bash

set -e


echo "=============================================="
echo " TSM MORTGAGE V2 CERTIFICATION"
echo "=============================================="


node --check server/mortgage/mortgage-kpis.js

node --check server/mortgage/mortgage-executive.js


npx playwright test \
tests/e2e/mortgage/mortgage-complete-lifecycle.spec.js


echo ""
echo "=============================================="
echo " MORTGAGE OPERATIONS V2 READY"
echo "=============================================="
