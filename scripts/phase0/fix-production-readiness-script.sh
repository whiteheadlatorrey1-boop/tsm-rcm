#!/bin/bash

set -e

echo "================================"
echo " FIXING PRODUCTION READINESS SCRIPT"
echo "================================"

SCRIPT="scripts/phase0/run-production1-readiness.sh"

if [ ! -f "$SCRIPT" ]; then
    echo "✗ Missing $SCRIPT"
    exit 1
fi


echo ""
echo "[1/3] Detecting lifecycle test..."

LIFECYCLE_TEST=$(find tests/e2e -name "*lifecycle*.spec.js" | head -1)

if [ -z "$LIFECYCLE_TEST" ]; then
    echo "✗ No lifecycle test found"
    exit 1
fi

echo "✓ Found:"
echo "$LIFECYCLE_TEST"


echo ""
echo "[2/3] Updating readiness script..."


python3 <<PYTHON
from pathlib import Path

path = Path("$SCRIPT")

text = path.read_text()

old = """echo ""
echo "[4/7] Enterprise Lifecycle Certification"

npx playwright test \\
tests/e2e/tsm-enterprise-document-lifecycle.spec.js
"""

new = """echo ""
echo "[4/7] Enterprise Lifecycle Certification"

LIFECYCLE_TEST=$(find tests/e2e -name "*lifecycle*.spec.js" | head -1)

if [ -z "$LIFECYCLE_TEST" ]; then
    echo "✗ Lifecycle certification test missing"
    exit 1
fi

echo "Running: $LIFECYCLE_TEST"

npx playwright test "$LIFECYCLE_TEST"
"""

if old not in text:
    print("Lifecycle block already changed or not found")
else:
    text = text.replace(old,new)
    path.write_text(text)
    print("✓ Lifecycle block updated")

PYTHON


echo ""
echo "[3/3] Making scripts executable..."

chmod +x scripts/phase0/run-production1-readiness.sh


echo ""
echo "================================"
echo " FIX COMPLETE"
echo "================================"

echo ""
echo "Run:"
echo ""
echo "./scripts/phase0/run-production1-readiness.sh"
echo ""
