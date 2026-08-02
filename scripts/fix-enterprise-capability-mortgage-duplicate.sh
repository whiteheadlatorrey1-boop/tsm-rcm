#!/bin/bash

set -e

echo "=========================================="
echo "TSM Capability Matrix Duplicate Fix"
echo "=========================================="

FILE="tests/e2e/enterprise-capability-coverage.spec.js"

BACKUP="backups/capability-fix/$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP"

echo "Backing up:"
cp "$FILE" "$BACKUP/"

python3 <<'PY'

from pathlib import Path

file = Path("tests/e2e/enterprise-capability-coverage.spec.js")

text = file.read_text()

duplicate = """  { column: 'Mortgage', key: 'Mortgage', pages: [
    '/html/war-rooms/mortgage/mortgage-war-room.html',
    '/html/war-rooms/mortgage/mortgage-strategist.html',
    '/html/war-rooms/mortgage/mortgage-executive-portal.html',
  ]},
"""

count = text.count(duplicate)

print("Mortgage blocks found:", count)

if count > 1:
    text = text.replace(
        duplicate + duplicate,
        duplicate
    )

file.write_text(text)

print("Duplicate Mortgage entry removed")

PY


echo ""
echo "Verifying..."

grep -n "column: 'Mortgage'" "$FILE"


echo ""
echo "Cleaning Playwright..."

rm -rf playwright-report
rm -rf test-results


echo ""
echo "Testing discovery..."

npx playwright test --list


echo ""
echo "=========================================="
echo "FIX COMPLETE"
echo "Backup:"
echo "$BACKUP"
echo "=========================================="
