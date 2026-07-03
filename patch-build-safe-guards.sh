#!/usr/bin/env bash

FILE="html/build.js"

if [ ! -f "$FILE" ]; then
  echo "❌ build.js not found at $FILE"
  exit 1
fi

echo "=================================="
echo "TSM BUILD SAFE-GUARD PATCH"
echo "=================================="

# Backup
cp "$FILE" "$FILE.bak"
echo "✔ Backup created: $FILE.bak"

# Inject safe guard helper if not already present
if ! grep -q "safeProcessScriptBlock" "$FILE"; then
cat >> "$FILE" << 'INJECT'

/**
 * TSM SAFE SCRIPT GUARD (auto-injected)
 * Prevents obfuscated / malformed inline scripts from crashing build
 */
function safeProcessScriptBlock(scriptContent, filePath) {
  try {
    // skip known obfuscated or broken patterns
    if (
      scriptContent.includes("_0x") ||
      scriptContent.includes("(((.+)+") ||
      scriptContent.length > 50000
    ) {
      console.warn("⚠️ Skipped obfuscated script in " + filePath);
      return null;
    }

    return processScriptBlock(scriptContent);
  } catch (err) {
    console.warn(
      "⚠️ Skipped invalid script block in " +
      filePath +
      ": " +
      err.message
    );
    return null;
  }
}
INJECT

  echo "✔ Safe guard injected"
else
  echo "✔ Safe guard already exists (skipping inject)"
fi

# Try to auto-replace simple processScriptBlock calls
sed -i 's/processScriptBlock(/safeProcessScriptBlock(/g' "$FILE"

echo "✔ Replaced processScriptBlock calls"

echo "=================================="
echo "DONE"
echo "Run: npm run build:dry"
echo "=================================="
