#!/bin/bash
set -e

echo "=============================================="
echo " TSM MORTGAGE SAP ENTERPRISE V13 CERT"
echo "=============================================="

npx playwright test \
tests/e2e/mortgage/mortgage-sap-enterprise-v13.spec.js


echo
echo "=============================================="
echo " MORTGAGE SAP ENTERPRISE V13 READY"
echo "=============================================="
