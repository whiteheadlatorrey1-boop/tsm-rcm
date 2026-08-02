#!/bin/bash

set -e

FILE="html/healthcare/hc-main-strategist.html"
BACKUP_DIR="backups/platform-route-fix"

echo "=========================================="
echo "TSM HEALTHCARE KERNEL ORDER FIX"
echo "=========================================="

mkdir -p "$BACKUP_DIR"

echo "Creating backup..."

cp "$FILE" "$BACKUP_DIR/hc-main-strategist.before-kernel.$(date +%Y%m%d_%H%M%S).html"


echo "Moving kernel bootstrap earlier..."

python3 <<'PY'
from pathlib import Path

p = Path("html/healthcare/hc-main-strategist.html")

data = p.read_text()

kernel = '<script src="/html/core/tsm-kernel.js"></script>'

if kernel not in data:
    raise SystemExit("ERROR: kernel script not found")

# remove existing placement
data = data.replace(kernel, "")

anchor = '<script src="/shared/tsm-cure-cheatsheet.js"></script>'

if anchor not in data:
    raise SystemExit("ERROR: anchor script missing")

# inject kernel before dependent modules
data = data.replace(
    anchor,
    kernel + "\n" + anchor
)

p.write_text(data)

print("PASS: kernel moved before dependent modules")
PY


echo
echo "Verifying order..."

grep -n "<script" "$FILE" | tail -20


echo
echo "Running Healthcare E2E..."

npx playwright test tests/e2e/tsm-platform.spec.js --grep "Healthcare"


echo
echo "=========================================="
echo "HEALTHCARE KERNEL FIX COMPLETE"
echo "=========================================="
