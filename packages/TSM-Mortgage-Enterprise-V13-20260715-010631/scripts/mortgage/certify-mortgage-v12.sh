#!/bin/bash
set -e

echo "=============================================="
echo " TSM MORTGAGE EVIDENCE GOVERNANCE V12 CERT"
echo "=============================================="

npx playwright test \
tests/e2e/mortgage/mortgage-governance-v12.spec.js

echo
echo "=============================================="
echo " MORTGAGE EVIDENCE GOVERNANCE V12 READY"
echo "=============================================="
