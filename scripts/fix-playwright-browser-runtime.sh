#!/bin/bash

set -e

echo "=========================================="
echo "TSM Playwright Browser Runtime Repair"
echo "=========================================="

echo ""
echo "Checking Node..."

node -v
npm -v


echo ""
echo "Installing Playwright browsers..."

npx playwright install chromium


echo ""
echo "Installing browser dependencies..."

npx playwright install-deps chromium || true


echo ""
echo "Cleaning old test artifacts..."

rm -rf test-results
rm -rf playwright-report


echo ""
echo "Verifying browser availability..."

npx playwright --version


echo ""
echo "Running smoke discovery..."

npx playwright test --list


echo ""
echo "=========================================="
echo "PLAYWRIGHT BROWSER RUNTIME READY"
echo "=========================================="
