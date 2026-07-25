#!/usr/bin/env bash
set -e

echo "======================================"
echo "TSM RELAY SYSTEM ONE-SHOT FIX"
echo "======================================"

ROOT="html/war-rooms"
BACKUP="backup_relay_fix_$(date +%s)"

echo "[1/6] Creating backup..."
cp -r "$ROOT" "$BACKUP"

echo "[2/6] Normalizing RELAY KEY names (removing hyphens)..."

# Fix TSM_*-* -> TSM_*_* (hyphen normalization)
find "$ROOT" -type f -name "*.html" -exec sed -i \
  -e 's/TSM_INTEGRATION-HUB_RELAY/TSM_INTEGRATION_HUB_RELAY/g' \
  -e 's/TSM_DIGITAL-TWIN_RELAY/TSM_DIGITAL_TWIN_RELAY/g' {} +

echo "[3/6] Injecting relay core helper..."

mkdir -p html/core

cat > html/core/tsm-relay-core.js << 'EOF'
/**
 * TSM RELAY CORE v1
 * Standardized relay bus for all war rooms
 */

(function () {
  function buildKey(vertical) {
    return `TSM_${vertical.toUpperCase()}_RELAY`;
  }

  window.writeRelay = function (vertical, payload) {
    const key = buildKey(vertical);

    const enriched = {
      ...payload,
      relayKey: key,
      timestamp: new Date().toISOString(),
      source: "TSM_RELAY_CORE"
    };

    try {
      sessionStorage.setItem(key, JSON.stringify(enriched));
      localStorage.setItem(key, JSON.stringify(enriched));
    } catch (e) {
      console.error("Relay write failed:", e);
    }

    window.dispatchEvent(new CustomEvent("TSM_RELAY_EVENT", {
      detail: enriched
    }));

    console.log("[TSM RELAY]", key, enriched);

    return enriched;
  };
})();
EOF

echo "[4/6] Injecting relay-core into war rooms..."

find "$ROOT" -type f -name "*.html" | while read file; do
  if ! grep -q "tsm-relay-core.js" "$file"; then
    sed -i 's#</head>#<script src="/html/core/tsm-relay-core.js"></script>\n</head>#' "$file"
  fi
done

echo "[5/6] Replacing inline relay writes with unified function..."

# Replace common relay write patterns (safe generic replacement)
find "$ROOT" -type f -name "*.html" -exec sed -i \
  -e 's/localStorage\.setItem(\x27TSM_\([^ ]*\)_RELAY\x27,/writeRelay("\L\1",/g' \
  -e 's/sessionStorage\.setItem(\x27TSM_\([^ ]*\)_RELAY\x27,/writeRelay("\L\1",/g' {} +

echo "[6/6] Final validation scan..."

echo ""
echo "=== Remaining hyphen RELAY keys ==="
grep -R "TSM_.*-.*_RELAY" "$ROOT" || echo "None found"

echo ""
echo "=== DONE ==="
echo "Backup saved to: $BACKUP"
echo "Relay system normalized and core injected."
echo "======================================"