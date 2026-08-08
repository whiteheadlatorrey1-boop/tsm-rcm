#!/bin/bash

set -e

echo "🔧 TSM Static Image Fix"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "📁 Project root: $ROOT"

# Create assets folder
mkdir -p public/images

# Find screenshot
SCREENSHOT=$(find . -type f -iname "*Screenshot*2026-07-22*" | head -1)

if [ -z "$SCREENSHOT" ]; then
    echo "⚠️ Screenshot file not found"
else
    echo "✅ Found: $SCREENSHOT"

    cp "$SCREENSHOT" \
    "public/images/demo-dashboard-screenshot.png"

    echo "✅ Copied to:"
    echo "public/images/demo-dashboard-screenshot.png"
fi


# Detect express server
SERVER_FILE=$(find server -maxdepth 2 -name "*.js" | head -1)

if [ -z "$SERVER_FILE" ]; then
    echo "⚠️ No server JS file found"
    exit 0
fi

echo "🖥️ Updating $SERVER_FILE"


if grep -q "express.static.*public" "$SERVER_FILE"; then
    echo "✅ Static route already exists"
else

cat >> "$SERVER_FILE" <<'EOF'


// TSM Static Assets Mount
const path = require("path");

app.use(
  "/images",
  express.static(path.join(__dirname, "../public/images"))
);

EOF

echo "✅ Added /images static route"

fi


echo ""
echo "🚀 Restart server:"
echo "npm restart"
echo ""
echo "Test:"
echo "http://localhost:8080/images/demo-dashboard-screenshot.png"