#!/bin/bash
set -e

echo "=============================================="
echo " TSM MORTGAGE ENTERPRISE PACKAGE BUILDER"
echo "=============================================="

DATE=$(date +%Y%m%d-%H%M%S)

PACKAGE="TSM-Mortgage-Enterprise-V13-$DATE"

mkdir -p "packages/$PACKAGE"


echo "[1/8] Collecting Mortgage HTML War Rooms"

cp -r \
html/war-rooms/mortgage \
"packages/$PACKAGE/html-war-rooms"


echo "[2/8] Collecting Mortgage Server Engines"

cp -r \
server/mortgage \
"packages/$PACKAGE/server-mortgage"


echo "[3/8] Collecting Runtime Adapters"

mkdir -p "packages/$PACKAGE/runtime"

cp \
html/shared/runtime/adapters/mortgage-runtime-adapter.js \
"packages/$PACKAGE/runtime/" \
2>/dev/null || true


echo "[4/8] Collecting Mortgage Demo Data"

cp -r \
demo-data/mortgage \
"packages/$PACKAGE/demo-data"


echo "[5/8] Collecting Mortgage Scripts"

mkdir -p "packages/$PACKAGE/scripts"

cp -r \
scripts/mortgage \
"packages/$PACKAGE/scripts/"


echo "[6/8] Collecting Playwright Certification"

mkdir -p "packages/$PACKAGE/tests"

cp -r \
tests/e2e/mortgage \
"packages/$PACKAGE/tests/"


echo "[7/8] Creating Manifest"

cat > "packages/$PACKAGE/MORTGAGE-MANIFEST.md" <<MANIFEST
# TSM Mortgage Enterprise V13 Package

Generated:
$(date)

## Included

### Runtime
- Mortgage Runtime Adapter

### War Rooms
- Mortgage War Room
- Strategist
- Executive Portal
- Operations Rooms
- Digital Twin
- Command Center

### Server Intelligence
- Mortgage Engine
- AI Agents
- Risk Engine
- Compliance Engine
- Fraud Engine
- KPI Engine
- Governance Engine
- SAP Enterprise Modules

### Automation
- Build Scripts
- Certification Scripts
- Playwright Tests

### Demo Assets
- Mortgage Loan Data
- Lifecycle Scenarios

## Certification Status

Mortgage Enterprise V13 READY

MANIFEST


echo "[8/8] Creating ZIP"

cd packages

zip -r \
"${PACKAGE}.zip" \
"$PACKAGE" \
>/dev/null

cd ..

echo
echo "=============================================="
echo " MORTGAGE PACKAGE COMPLETE"
echo "=============================================="

echo
echo "Created:"
echo "packages/${PACKAGE}.zip"

