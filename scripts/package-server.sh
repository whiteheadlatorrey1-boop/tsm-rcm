#!/bin/bash
set -e

echo "=============================================="
echo " TSM SERVER PACKAGE BUILDER"
echo "=============================================="

SOURCE="server"

if [ ! -d "$SOURCE" ]; then
    echo "ERROR: $SOURCE not found."
    exit 1
fi

DATE=$(date +%Y%m%d-%H%M%S)
PACKAGE="TSM-Server-$DATE"

mkdir -p packages

echo "[1/6] Creating package workspace"
mkdir -p "packages/$PACKAGE"

echo "[2/6] Copying server directory"
cp -R "$SOURCE" "packages/$PACKAGE/server"

echo "[3/6] Creating directory inventory"

find "$SOURCE" -type d | sort \
> "packages/${PACKAGE}-directories.txt"

echo "[4/6] Creating file inventory"

find "$SOURCE" -type f | sort \
> "packages/${PACKAGE}-files.txt"

echo "[5/6] Creating manifest"

cat > "packages/${PACKAGE}-manifest.txt" <<EOF
=========================================================
TSM Server Package
=========================================================

Created:
$(date)

Source:
$SOURCE

Total Directories:
$(find "$SOURCE" -type d | wc -l)

Total Files:
$(find "$SOURCE" -type f | wc -l)

Approximate Size:
$(du -sh "$SOURCE" | cut -f1)

Top-Level Modules:

$(find "$SOURCE" -mindepth 1 -maxdepth 1 | sort)

=========================================================

This package contains the complete TSM server layer,
including all engines, APIs, routers, AI services,
runtime services, enterprise modules, and vertical
implementations.

=========================================================
EOF

echo "[6/6] Creating ZIP"

(
cd packages
zip -rq "${PACKAGE}.zip" "$PACKAGE"
)

rm -rf "packages/$PACKAGE"

echo
echo "=============================================="
echo " TSM SERVER PACKAGE READY"
echo "=============================================="
echo
echo "ZIP:"
echo "packages/${PACKAGE}.zip"
echo
echo "Manifest:"
echo "packages/${PACKAGE}-manifest.txt"
echo
echo "Directory List:"
echo "packages/${PACKAGE}-directories.txt"
echo
echo "File List:"
echo "packages/${PACKAGE}-files.txt"
echo
echo "Server Statistics:"
echo "  Directories : $(find "$SOURCE" -type d | wc -l)"
echo "  Files       : $(find "$SOURCE" -type f | wc -l)"
echo "  Size        : $(du -sh "$SOURCE" | cut -f1)"
echo
echo "Package complete."