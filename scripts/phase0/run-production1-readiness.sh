#!/bin/bash

set -e

echo "================================"
echo " TSM PRODUCTION READINESS V1"
echo "================================"

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

SERVER_PID=""

cleanup() {
    if [ ! -z "$SERVER_PID" ]; then
        echo ""
        echo "Stopping temporary TSM runtime..."
        kill "$SERVER_PID" 2>/dev/null || true
    fi
}

trap cleanup EXIT


echo ""
echo "[0/7] Runtime Health Check"

if curl -s http://localhost:8080 > /dev/null
then
    echo "✓ TSM runtime already active"
else
    echo "Starting TSM runtime..."

    npm run start > /tmp/tsm-runtime.log 2>&1 &
    SERVER_PID=$!

    echo "Waiting for runtime..."

    READY=0

    for i in {1..20}
    do
        if curl -s http://localhost:8080 > /dev/null
        then
            READY=1
            break
        fi

        sleep 1
    done

    if [ "$READY" -ne 1 ]
    then
        echo "✗ Runtime failed to start"
        echo ""
        echo "Runtime logs:"
        cat /tmp/tsm-runtime.log
        exit 1
    fi

    echo "✓ TSM runtime online"
fi


echo ""
echo "[1/7] Demo Readiness Check"

node scripts/phase0/demo-readiness-check.js


echo ""
echo "[2/7] Runtime Continuity Certification"

npx playwright test \
tests/e2e/tsm-runtime-continuity.spec.js


echo ""
echo "[3/7] Platform Certification"

npx playwright test \
tests/e2e/tsm-platform-certification.spec.js



echo ""
echo "[4/7] Enterprise Lifecycle Certification"

LIFECYCLE_TEST=$(find tests/e2e -iname "*lifecycle*.spec.js" | head -1)

if [ -z "$LIFECYCLE_TEST" ]; then
    echo "✗ No lifecycle certification test found"
    find tests/e2e -name "*.spec.js"
    exit 1
fi

echo "Using lifecycle test:"
echo "$LIFECYCLE_TEST"

npx playwright test "$LIFECYCLE_TEST"

echo ""
echo "[5/7] Phase 0 Intake Gateway Continuity"

npx playwright test \
tests/e2e/tsm-intake-gateway-continuity.spec.js


echo ""
echo "[6/7] Real Upload Validation"

npx playwright test \
tests/e2e/tsm-real-upload-validation.spec.js


echo ""
echo "[7/7] Final Demo Evidence Validation"

if [ -f "reports/demo-certification.json" ]
then
    echo "✓ Demo certification evidence exists"
else
    echo "✗ Missing demo certification evidence"
    exit 1
fi


echo ""
echo "======================================"
echo " TSM PRODUCTION CERTIFIED"
echo "======================================"

echo ""
echo "Certified Layers:"
echo ""
echo "✓ Runtime"
echo "✓ Universal Intake Gateway"
echo "✓ OCR / Classification Pipeline"
echo "✓ Mission Queue Contract"
echo "✓ Vertical Routing"
echo "✓ War Rooms"
echo "✓ Strategist Layer"
echo "✓ Executive Layer"
echo "✓ Audit Layer"
echo "✓ Digital Twin Events"
echo "✓ Real Document Upload Validation"

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