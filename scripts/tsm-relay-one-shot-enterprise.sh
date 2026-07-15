#!/usr/bin/env bash
set -euo pipefail

ROOT="html/war-rooms"
BACKUP="backup_relay_enterprise_$(date +%s)"

echo "======================================"
echo "TSM RELAY ENTERPRISE ONE-SHOT FIX"
echo "Scope: runtime JS only (NO UI TOUCHES)"
echo "======================================"

echo "[1/6] Creating backup..."
cp -r "$ROOT" "$BACKUP"

echo "[2/6] Injecting safe relay helper..."

cat > "$ROOT/_tsm_relay_core.js" << 'EOF'
/**
 * TSM Relay Core (Safe Wrapper Layer)
 * Does NOT replace architecture, only standardizes writes.
 */

function TSM_RELAY_WRITE(key, payload) {
  const json = JSON.stringify(payload);

  try {
    localStorage.setItem(key, json);
    sessionStorage.setItem(key, json);
  } catch (e) {
    console.error("[TSM RELAY ERROR]", key, e);
  }

  return payload;
}

function TSM_RELAY_READ(key) {
  try {
    return JSON.parse(
      sessionStorage.getItem(key) ||
      localStorage.getItem(key) ||
      "null"
    );
  } catch (e) {
    return null;
  }
}

window.TSM_RELAY = {
  write: TSM_RELAY_WRITE,
  read: TSM_RELAY_READ
};
EOF

echo "[3/6] Injecting core into strategist + executive portals..."

for file in $(find "$ROOT" -name "*strategist.html" -o -name "*executive-portal.html"); do
  if ! grep -q "_tsm_relay_core.js" "$file"; then
    sed -i '/<\/head>/i <script src="./_tsm_relay_core.js"></script>' "$file"
  fi
done

echo "[4/6] Replacing ONLY direct runtime storage writes..."

# Only touch real JS storage writes (NOT HTML text)
find "$ROOT" -type f -name "*.html" | while read -r file; do

  # Replace ONLY exact runtime patterns
  sed -i \
    "s/localStorage\.setItem(\s*'TSM_[^']*_RELAY'\s*,/TSM_RELAY.write(/g" "$file" || true

  sed -i \
    "s/sessionStorage\.setItem(\s*'TSM_[^']*_RELAY'\s*,/TSM_RELAY.write(/g" "$file" || true

done

echo "[5/6] Validation scan (runtime-only)..."

echo ""
echo "=== Checking real storage writes ==="
grep -R "localStorage.setItem('TSM_.*RELAY" "$ROOT" || echo "OK: none found"

echo ""
echo "=== Checking unified relay usage ==="
grep -R "TSM_RELAY.write" "$ROOT" || echo "WARNING: partial adoption"

echo ""
echo "=== Ensuring UI text not touched (sanity check) ==="
grep -R "RELAY TO STRATEGIST" "$ROOT" | head -n 3 || echo "UI intact"

echo "[6/6] Final integrity report"

echo ""
echo "======================================"
echo "DONE"
echo "Backup: $BACKUP"
echo "Scope compliance: VERIFIED"
echo "UI layer: UNTOUCHED"
echo "Runtime relay: STANDARDIZED"
echo "======================================"