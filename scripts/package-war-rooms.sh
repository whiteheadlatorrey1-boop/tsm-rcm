#!/bin/bash
set -e

echo "=============================================="
echo " TSM WAR ROOMS PACKAGE BUILDER"
echo "=============================================="

SOURCE="html/war-rooms"

if [ ! -d "$SOURCE" ]; then
    echo "ERROR: $SOURCE not found."
    exit 1
fi

DATE=$(date +%Y%m%d-%H%M%S)
PACKAGE="TSM-WarRooms-$DATE"

mkdir -p packages

echo "[1/7] Creating package workspace"
mkdir -p "packages/$PACKAGE"

echo "[2/7] Copying War Rooms"
cp -R "$SOURCE" "packages/$PACKAGE/war-rooms"

echo "[3/7] Creating directory inventory"
find "$SOURCE" -type d | sort \
> "packages/${PACKAGE}-directories.txt"

echo "[4/7] Creating file inventory"
find "$SOURCE" -type f | sort \
> "packages/${PACKAGE}-files.txt"

TOTAL_DIRS=$(find "$SOURCE" -type d | wc -l)
TOTAL_FILES=$(find "$SOURCE" -type f | wc -l)
TOTAL_HTML=$(find "$SOURCE" -name "*.html" | wc -l)
TOTAL_JS=$(find "$SOURCE" -name "*.js" | wc -l)
TOTAL_CSS=$(find "$SOURCE" -name "*.css" | wc -l)
TOTAL_JSON=$(find "$SOURCE" -name "*.json" | wc -l)
SIZE=$(du -sh "$SOURCE" | cut -f1)

echo "[5/7] Creating manifest"

cat > "packages/${PACKAGE}-manifest.txt" <<EOF
=========================================================
TSM Enterprise War Rooms Package
=========================================================

Created:
$(date)

Source:
$SOURCE

Statistics
----------
Directories : $TOTAL_DIRS
Files       : $TOTAL_FILES
HTML        : $TOTAL_HTML
JavaScript  : $TOTAL_JS
CSS         : $TOTAL_CSS
JSON        : $TOTAL_JSON
Size        : $SIZE

Verticals
---------

$(find "$SOURCE" -mindepth 1 -maxdepth 1 -type d | sort)

Description
-----------

This package contains every Enterprise War Room,
Strategist, Executive Portal, Digital Twin,
and operational workspace located under:

html/war-rooms/

=========================================================
EOF

echo "[6/7] Creating ZIP"

(
cd packages
zip -rq "${PACKAGE}.zip" "$PACKAGE"
)

echo "[7/7] Cleaning workspace"

rm -rf "packages/$PACKAGE"

echo
echo "=============================================="
echo " WAR ROOMS PACKAGE READY"
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
echo "HTML        : $TOTAL_HTML"
echo "JavaScript  : $TOTAL_JS"
echo "CSS         : $TOTAL_CSS"
echo "JSON        : $TOTAL_JSON"
echo "Size        : $SIZE"
echo
echo "Detected War Room Verticals:"
find "$SOURCE" -mindepth 1 -maxdepth 1 -type d -printf "  • %f\n" | sort
echo
echo "Package complete."