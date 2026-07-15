#!/bin/bash

set -e

echo "================================"
echo " APPLYING TSM READINESS FIX"
echo "================================"


TARGET="scripts/phase0/run-production1-readiness.sh"


if [ ! -f "$TARGET" ]; then
    echo "Missing:"
    echo "$TARGET"
    exit 1
fi


echo ""
echo "[1/3] Backing up readiness script"

cp "$TARGET" "${TARGET}.backup"


echo ""
echo "[2/3] Replacing lifecycle test execution"


python3 <<'PY'

from pathlib import Path

path = Path("scripts/phase0/run-production1-readiness.sh")

text = path.read_text()


start = text.find('echo ""\necho "[4/7] Enterprise Lifecycle Certification"')

if start == -1:
    print("Lifecycle section not found")
    raise SystemExit(1)


end = text.find('echo ""\necho "[5/7]', start)

if end == -1:
    print("Lifecycle ending marker not found")
    raise SystemExit(1)


replacement = r'''
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

'''

text = text[:start] + replacement + text[end:]

path.write_text(text)

print("Lifecycle section replaced")

PY


echo ""
echo "[3/3] Verify lifecycle discovery"

find tests/e2e -iname "*lifecycle*.spec.js"


chmod +x "$TARGET"


echo ""
echo "================================"
echo " FIX APPLIED"
echo "================================"

echo ""
echo "Run:"
echo "./scripts/phase0/run-production1-readiness.sh"
