#!/bin/bash

set -e

echo ""
echo "======================================"
echo " TSM ENTERPRISE CERTIFICATION RUN"
echo "======================================"
echo ""


echo "[1/5] Demo Readiness"
echo ""

node scripts/phase0/demo-readiness-check.js


echo ""
echo "[2/5] Runtime Continuity"
echo ""

npx playwright test \
tests/e2e/tsm-runtime-continuity.spec.js


echo ""
echo "[3/5] Platform Certification"
echo ""

npx playwright test \
tests/e2e/tsm-platform-certification.spec.js


echo ""
echo "[4/5] Enterprise Lifecycle"
echo ""

npx playwright test \
tests/e2e/enterprise-end-to-end-lifecycle.spec.js


echo ""
echo "[5/5] Phase 0 Intake Gateway Continuity"
echo ""

npx playwright test \
tests/e2e/tsm-intake-gateway-continuity.spec.js


echo ""
echo "======================================"
echo " TSM ENTERPRISE CERTIFIED"
echo "======================================"
echo ""

echo "Certified Layers:"
echo ""
echo "✓ Universal Intake Gateway"
echo "✓ OCR / Classification Pipeline"
echo "✓ Mission Queue Contract"
echo "✓ War Room Routing"
echo "✓ Strategist Layer"
echo "✓ Executive Layer"
echo "✓ Audit Layer"
echo "✓ Digital Twin Events"
echo ""

echo "Industries:"
echo ""
echo "✓ Healthcare"
echo "✓ Construction"
echo "✓ Real Estate / Mortgage"
echo "✓ BPO"
echo "✓ MDM"
echo ""

echo "Status:"
echo "READY FOR CUSTOMER PILOTS"
echo "READY FOR INVESTOR DEMOS"
echo "READY FOR SALES DEMOS"

echo ""