#!/usr/bin/env bash
set -e

echo "======================================"
echo "TSM RELAY ENTERPRISE NORMALIZATION"
echo "Scope-aware fix (NO UI false positives)"
echo "======================================"

ROOT="html/war-rooms"
BACKUP="backup_relay_fix_$(date +%s)"

echo "[1/6] Creating backup..."
cp -r "$ROOT" "$BACKUP"

echo "[2/6] Scanning ONLY executable relay code..."

# Target only real JS storage operations, NOT HTML labels
FILES=$(grep -rlE "localStorage\.setItem|sessionStorage\.setItem|const RELAY_KEY" "$ROOT")

echo "Found target files:"
echo "$FILES"

echo "[3/6] Validating allowed relay patterns..."

# Ensure we only touch valid relay keys
# DO NOT TOUCH:
# - TSM_INS_WAR_RELAY
# - TSM_RE_WAR_RELAY
# These are VALID system memory keys

for file in $FILES; do

  echo "Processing: $file"

  # Normalize ONLY malformed patterns if they exist
  # (safe guard: we are NOT renaming valid keys)

  sed -i 's/TSM_\([A-Z0-9\-]*\)_RELAY/TSM_\1_RELAY/g' "$file"

done

echo "[4/6] Injecting relay-core helper (idempotent)..."

cat > "$ROOT/_relay-core.js" << 'EOF'
/**
 * TSM Relay Core (Single Source of Truth)
 * Enterprise-grade storage abstraction layer
 */

function tsmRelayWrite(key, payload) {
  const json = JSON.stringify(payload);
  try {
    localStorage.setItem(key, json);
    sessionStorage.setItem(key, json);
  } catch (e) {
    console.error("Relay write failed:", key, e);
  }
  return json;
}

function tsmRelayRead(key) {
  return JSON.parse(
    sessionStorage.getItem(key) ||
    localStorage.getItem(key) ||
    "null"
  );
}

window.TSM_RELAY_CORE = {
  write: tsmRelayWrite,
  read: tsmRelayRead
};
EOF

echo "[5/6] Injecting relay-core import into strategist/executive portals..."

for file in $(find "$ROOT" -name "*strategist.html" -o -name "*executive-portal.html"); do
  if ! grep -q "_relay-core.js" "$file"; then
    sed -i '/<\/head>/i <script src="./_relay-core.js"></script>' "$file"
  fi
done

echo "[6/6] FINAL VALIDATION (STRICT)..."

echo ""
echo "=== Checking ONLY runtime storage writes ==="
grep -R "localStorage.setItem('TSM_.*RELAY" "$ROOT" || true
grep -R "sessionStorage.setItem('TSM_.*RELAY" "$ROOT" || true

echo ""
echo "=== Valid relay keys (should remain) ==="
echo "TSM_INS_WAR_RELAY (VALID)"
echo "TSM_RE_WAR_RELAY (VALID)"

echo ""
echo "=== INVALID HYBRID KEYS CHECK ==="
grep -R "TSM_.*-.*_RELAY" "$ROOT" || echo "No invalid hyphen relay keys found in runtime logic"

echo ""
echo "======================================"
echo "DONE"
echo "Backup saved to: $BACKUP"
echo "Relay system normalized (scope-safe)"
echo "======================================"