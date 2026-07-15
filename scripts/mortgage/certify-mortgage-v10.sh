#!/bin/bash
set -e

echo "=============================================="
echo " TSM MORTGAGE DIGITAL TWIN PLATFORM V10 CERT"
echo "=============================================="

npx playwright test tests/e2e/mortgage/mortgage-digital-twin-v10.spec.js


echo ""
echo "=============================================="
echo " MORTGAGE DIGITAL TWIN PLATFORM V10 READY"
echo "=============================================="
