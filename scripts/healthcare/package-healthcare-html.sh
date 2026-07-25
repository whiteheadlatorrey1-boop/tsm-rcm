#!/bin/bash
set -e

echo "=============================================="
echo " TSM HEALTHCARE HTML PACKAGE BUILDER"
echo "=============================================="

SOURCE="html/healthcare"

if [ ! -d "$SOURCE" ]; then
    echo "ERROR: $SOURCE not found."
    exit 1
fi

DATE=$(date +%Y%m%d-%H%M%S)
PACKAGE="TSM-Healthcare-HTML-$DATE"

mkdir -p packages

echo "[1/4] Creating temporary package directory"
mkdir -p "packages/$PACKAGE"

echo "[2/4] Copying Healthcare HTML"
cp -R "$SOURCE" "packages/$PACKAGE/healthcare"

echo "[3/4] Creating manifest"

cat > "packages/${PACKAGE}-manifest.txt" <<EOF
========================================
TSM Healthcare HTML Package
========================================

Created:
$(date)

Source:
$SOURCE

Files Included:

$(find "$SOURCE" -type f | sort)

========================================
EOF

echo "[4/4] Creating ZIP"

(
cd packages
zip -rq "${PACKAGE}.zip" "$PACKAGE"
)

rm -rf "packages/$PACKAGE"

echo
echo "=============================================="
echo " HEALTHCARE HTML PACKAGE READY"
echo "=============================================="
echo
echo "ZIP:"
echo "packages/${PACKAGE}.zip"
echo
echo "MANIFEST:"
echo "packages/${PACKAGE}-manifest.txt"
echo
echo "Archive contains:"
echo "  • All HTML files"
echo "  • CSS/JS files within html/healthcare"
echo "  • Complete folder structure"
echo
echo "Done."