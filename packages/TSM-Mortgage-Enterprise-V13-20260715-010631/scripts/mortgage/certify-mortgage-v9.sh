#!/bin/bash
set -e

echo "=============================================="
echo " TSM MORTGAGE ENTERPRISE OPERATING SYSTEM V9 CERT"
echo "=============================================="

npx playwright test tests/e2e/mortgage/mortgage-enterprise-os.spec.js

echo ""
echo "=============================================="
echo " MORTGAGE ENTERPRISE OPERATING SYSTEM V9 READY"
echo "=============================================="
