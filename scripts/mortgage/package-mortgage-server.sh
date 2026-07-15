#!/bin/bash
set -e

echo "=============================================="
echo " TSM MORTGAGE SERVER ENGINE PACKAGE"
echo "=============================================="

DATE=$(date +%Y%m%d-%H%M%S)
PACKAGE="TSM-Mortgage-Server-$DATE"

mkdir -p packages

echo "[1/3] Packaging server/mortgage"

zip -r \
"packages/$PACKAGE.zip" \
server/mortgage \
>/dev/null

echo "[2/3] Creating manifest"

unzip -l \
"packages/$PACKAGE.zip" \
> "packages/$PACKAGE-manifest.txt"

echo "[3/3] Complete"

echo
echo "=============================================="
echo " MORTGAGE SERVER PACKAGE READY"
echo "=============================================="

echo "ZIP:"
echo "packages/$PACKAGE.zip"

echo "MANIFEST:"
echo "packages/$PACKAGE-manifest.txt"

