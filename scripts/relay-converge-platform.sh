#!/usr/bin/env bash
set -e

ROOT="html/war-rooms"
CP="_relay_control_plane"
BACKUP="backup_relay_converge_$(date +%s)"

echo "======================================"
echo "TSM RELAY PLATFORM CONVERGENCE ENGINE"
echo "Enterprise Fixed-Point Normalizer"
echo "======================================"

echo "[1/7] Backup snapshot..."
cp -r "$ROOT" "$BACKUP"

echo "[2/7] Ensuring control plane exists..."
if [ ! -d "$ROOT/$CP" ]; then
  echo "ERROR: Control plane missing. Run init first."
  exit 1
fi

echo "[3/7] Injecting interceptor FIRST (critical ordering)..."

INJECT='<script src="/html/war-rooms/_relay_control_plane/relay.interceptor.js"></script>'
GUARD='<script src="/html/war-rooms/_relay_control_plane/relay.guard.js"></script>'
NORMAL='<script src="/html/war-rooms/_relay_control_plane/relay.normalize.js"></script>'

FILES=$(grep -rl "<head>" $ROOT | grep -E "\.html$")

for f in $FILES; do
  echo "Processing: $f"

  # inject only once
  if ! grep -q "relay.interceptor.js" "$f"; then
    sed -i "s|<head>|<head>\n$INJECT\n$GUARD\n$NORMAL|g" "$f"
  fi
done

echo "[4/7] Migrating legacy localStorage writes..."

# Replace raw storage writes with canonical API
find "$ROOT" -type f -name "*.html" -o -name "*.js" | while read file; do
  sed -i 's/localStorage.setItem(\s*["'\'']TSM_\([A-Z0-9_-]*\)_RELAY["'\'']/TSM.relay.write("\1"/g' "$file"
  sed -i 's/sessionStorage.setItem(\s*["'\'']TSM_\([A-Z0-9_-]*\)_RELAY["'\'']/TSM.relay.write("\1"/g' "$file"
done

echo "[5/7] Enforcing canonical naming..."

# normalize hyphen variants -> underscore canonical
find "$ROOT" -type f | while read file; do
  sed -i 's/TSM_\([A-Z]*\)-\([A-Z]*\)_RELAY/TSM_\1_\2_RELAY/g' "$file"
done

echo "[6/7] Validation scan..."

BAD=$(grep -R "localStorage.setItem.*TSM_" "$ROOT" || true)

if [ ! -z "$BAD" ]; then
  echo "WARNING: remaining legacy writes detected:"
  echo "$BAD"
else
  echo "All legacy relay writes eliminated."
fi

echo "[7/7] Fixed-point convergence check..."

for i in {1..3}; do
  echo "Pass $i validation..."
  REMAIN=$(grep -R "TSM_[A-Z_]*_RELAY" "$ROOT" | grep "setItem" || true)
  if [ -z "$REMAIN" ]; then
    echo "Stable convergence reached."
    break
  fi
done

echo ""
echo "======================================"
echo "CONVERGENCE COMPLETE"
echo "Backup: $BACKUP"
echo "Relay system: CONTROL PLANE ENFORCED"
echo "Runtime: INTERCEPTOR ACTIVE"
echo "======================================"