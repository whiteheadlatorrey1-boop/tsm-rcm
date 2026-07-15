#!/bin/bash
set -e

echo "=============================================="
echo " TSM MORTGAGE NEURAL CONTROL PLANE V11 CERT"
echo "=============================================="

npx playwright test tests/e2e/mortgage/mortgage-neural-control-plane-v11.spec.js

echo ""
echo "=============================================="
echo " MORTGAGE NEURAL CONTROL PLANE V11 READY"
echo "=============================================="
