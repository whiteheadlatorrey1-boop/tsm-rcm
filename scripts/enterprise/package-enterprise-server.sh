#!/bin/bash
set -e

echo "=============================================="
echo " TSM ENTERPRISE SERVER PACKAGE BUILDER"
echo "=============================================="

SOURCE="server/enterprise"

if [ ! -d "$SOURCE" ]; then
    echo "ERROR: $SOURCE not found."
    exit 1
fi

DATE=$(date +%Y%m%d-%H%M%S)
PACKAGE="TSM-Enterprise-Server-$DATE"

mkdir -p packages

echo "[1/7] Creating package workspace"
mkdir -p "packages/$PACKAGE"

echo "[2/7] Copying Enterprise server"
cp -R "$SOURCE" "packages/$PACKAGE/enterprise"

echo "[3/7] Creating directory inventory"
find "$SOURCE" -type d | sort \
> "packages/${PACKAGE}-directories.txt"

echo "[4/7] Creating file inventory"
find "$SOURCE" -type f | sort \
> "packages/${PACKAGE}-files.txt"

echo "[5/7] Generating statistics"

TOTAL_FILES=$(find "$SOURCE" -type f | wc -l)
TOTAL_DIRS=$(find "$SOURCE" -type d | wc -l)
TOTAL_JS=$(find "$SOURCE" -name "*.js" | wc -l)
TOTAL_JSON=$(find "$SOURCE" -name "*.json" | wc -l)
TOTAL_MD=$(find "$SOURCE" -name "*.md" | wc -l)
SIZE=$(du -sh "$SOURCE" | cut -f1)

echo "[6/7] Creating manifest"

cat > "packages/${PACKAGE}-manifest.txt" <<EOF
==========================================================
TSM Enterprise Server Package
==========================================================

Created:
$(date)

Source:
$SOURCE

Statistics
----------
Directories : $TOTAL_DIRS
Files       : $TOTAL_FILES
JavaScript  : $TOTAL_JS
JSON        : $TOTAL_JSON
Markdown    : $TOTAL_MD
Size        : $SIZE

Top-Level Modules
-----------------

$(find "$SOURCE" -mindepth 1 -maxdepth 1 | sort)

Description
-----------
This package contains the Enterprise layer of TSM,
including enterprise orchestration, shared services,
runtime coordination, mission processing, adapters,
analytics, APIs, workflow orchestration, governance,
and supporting enterprise modules.

==========================================================
EOF

echo "[7/7] Creating ZIP"

(
    cd packages
    zip -rq "${PACKAGE}.zip" "$PACKAGE"
)

rm -rf "packages/$PACKAGE"

echo
echo "=============================================="
echo " ENTERPRISE SERVER PACKAGE READY"
echo "=============================================="
echo
echo "ZIP:"
echo "packages/${PACKAGE}.zip"
echo
echo "Manifest:"
echo "packages/${PACKAGE}-manifest.txt"
echo
echo "Directories:"
echo "packages/${PACKAGE}-directories.txt"
echo
echo "Files:"
echo "packages/${PACKAGE}-files.txt"
echo
echo "Summary"
echo "-------"
echo "Directories : $TOTAL_DIRS"
echo "Files       : $TOTAL_FILES"
echo "JavaScript  : $TOTAL_JS"
echo "JSON        : $TOTAL_JSON"
echo "Markdown    : $TOTAL_MD"
echo "Size        : $SIZE"
echo
echo "Enterprise server package complete."