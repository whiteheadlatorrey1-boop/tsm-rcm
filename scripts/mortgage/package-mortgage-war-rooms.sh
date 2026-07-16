#!/bin/bash
set -e

echo "=============================================="
echo " TSM MORTGAGE WAR ROOMS PACKAGE BUILDER"
echo "=============================================="

SOURCE="html/war-rooms/mortgage"

if [ ! -d "$SOURCE" ]; then
    echo "ERROR: $SOURCE not found."
    exit 1
fi

DATE=$(date +%Y%m%d-%H%M%S)
PACKAGE="TSM-Mortgage-WarRooms-$DATE"

mkdir -p packages

echo "[1/5] Creating package workspace"
mkdir -p "packages/$PACKAGE"

echo "[2/5] Copying Mortgage War Rooms"
cp -R "$SOURCE" "packages/$PACKAGE/mortgage-war-rooms"

echo "[3/5] Creating manifest"

cat > "packages/${PACKAGE}-manifest.txt" <<EOF
==================================================
TSM Mortgage War Rooms Package
==================================================

Created:
$(date)

Source:
$SOURCE

Directory Structure:

$(find "$SOURCE" -type d | sort)

--------------------------------------------------

Files:

$(find "$SOURCE" -type f | sort)

==================================================
EOF

echo "[4/5] Creating ZIP"

(
cd packages
zip -rq "${PACKAGE}.zip" "$PACKAGE"
)

echo "[5/5] Cleaning workspace"
rm -rf "packages/$PACKAGE"

echo
echo "=============================================="
echo " MORTGAGE WAR ROOMS PACKAGE READY"
echo "=============================================="
echo
echo "ZIP:"
echo "packages/${PACKAGE}.zip"
echo
echo "MANIFEST:"
echo "packages/${PACKAGE}-manifest.txt"
echo
echo "Contents:"
echo "  ✓ Mortgage War Room"
echo "  ✓ Strategist"
echo "  ✓ Executive Portal"
echo "  ✓ Loan Processing"
echo "  ✓ Underwriting"
echo "  ✓ Conditions"
echo "  ✓ Closing"
echo "  ✓ Funding"
echo "  ✓ Quality Control"
echo "  ✓ Compliance"
echo "  ✓ Post Closing"
echo "  ✓ Digital Twin"
echo "  ✓ Supporting assets (CSS/JS/images) under the folder"
echo
echo "Package complete."
