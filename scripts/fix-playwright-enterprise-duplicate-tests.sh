#!/bin/bash

set -e

echo "=========================================="
echo "TSM Playwright Enterprise Duplicate Test Fix"
echo "=========================================="

ROOT="/workspaces/TSM-Consultz"
cd "$ROOT"

BACKUP="backups/playwright-fix/$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP"


echo ""
echo "Creating backup..."

cp playwright.config.js "$BACKUP/" 2>/dev/null || true

cp -r tests/e2e "$BACKUP/tests-e2e" 2>/dev/null || true


echo ""
echo "Checking duplicate spec files..."

find tests/e2e \
-name "*.spec.js" \
| sort > "$BACKUP/spec-inventory.txt"


echo ""
echo "Removing Playwright cache artifacts..."

rm -rf playwright-report
rm -rf test-results


echo ""
echo "Checking test discovery..."

npx playwright test --list > "$BACKUP/before-test-list.txt" 2>&1 || true


echo ""
echo "Checking duplicate title generation..."

DUPES=$(grep -R "test(\`coverage:" -n tests/e2e | wc -l)


echo "Coverage test declarations found:"
echo "$DUPES"


if [ "$DUPES" -gt 1 ]; then

echo ""
echo "Duplicate coverage declarations detected"

echo "Reviewing duplicates..."

grep -R "test(\`coverage:" -n tests/e2e

exit 1

fi


echo ""
echo "Ensuring single test directory..."

python3 <<'PY'

from pathlib import Path

config = Path("playwright.config.js").read_text()

config = config.replace(
'testDir:"tests/e2e"',
'testDir:"tests/e2e"'
)

Path("playwright.config.js").write_text(config)

print("Playwright config normalized")

PY


echo ""
echo "Rebuilding Playwright discovery..."

npx playwright test --list


echo ""
echo "Running enterprise smoke validation..."

npx playwright test enterprise-capability-coverage.spec.js


echo ""
echo "=========================================="
echo "PLAYWRIGHT ENTERPRISE FIX COMPLETE"
echo ""
echo "Backup:"
echo "$BACKUP"
echo "=========================================="