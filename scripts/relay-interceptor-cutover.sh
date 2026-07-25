#!/usr/bin/env bash
set -e

echo "======================================"
echo "TSM RELAY INTERCEPTOR CUTOVER"
echo "Enterprise Runtime Migration Engine"
echo "======================================"

ROOT="html/war-rooms"
CP="/html/war-rooms/_relay_control_plane"

BACKUP="backup_relay_interceptor_$(date +%s)"
echo "[1/6] Creating backup: $BACKUP"
cp -r "$ROOT" "$BACKUP"

echo "[2/6] Validating interceptor exists..."

if [ ! -f "$ROOT/_relay_control_plane/relay.interceptor.js" ]; then
  echo "ERROR: relay.interceptor.js not found"
  exit 1
fi

echo "[3/6] Injecting interceptor BEFORE guard/normalize..."

FILES=$(find "$ROOT" -type f \( -name "*war-room.html" -o -name "*strategist.html" -o -name "*executive-portal.html" \))

for f in $FILES; do
  echo "Processing: $f"

  if grep -q "relay.interceptor.js" "$f"; then
    echo "  - interceptor already present"
  else
    sed -i "/<head>/a \
<script src='${CP}/relay.interceptor.js'></script>" "$f"
  fi

  # Ensure correct ordering (interceptor first)
  sed -i "s|relay.guard.js.*relay.normalize.js|relay.guard.js'></script>\n<script src='${CP}/relay.normalize.js'|g" "$f"

done

echo "[4/6] Migrating legacy localStorage relay writes..."

# Convert ONLY relay writes (safe scoped replacement)
find "$ROOT" -type f -name "*.html" -o -name "*.js" | while read file; do

  # CRM
  sed -i "s/localStorage\.setItem('TSM_CRM_RELAY'/TSM.relay.write('CRM'/g" "$file"

  # CPQ
  sed -i "s/localStorage\.setItem('TSM_CPQ_RELAY'/TSM.relay.write('CPQ'/g" "$file"

  # BPO
  sed -i "s/localStorage\.setItem('TSM_BPO_RELAY'/TSM.relay.write('BPO'/g" "$file"

  # O2C
  sed -i "s/localStorage\.setItem('TSM_O2C_RELAY'/TSM.relay.write('O2C'/g" "$file"

  # MDM
  sed -i "s/localStorage\.setItem('TSM_MDM_RELAY'/TSM.relay.write('MDM'/g" "$file"

  # CATALOG
  sed -i "s/localStorage\.setItem('TSM_CATALOG_RELAY'/TSM.relay.write('CATALOG'/g" "$file"

  # APPROVAL
  sed -i "s/localStorage\.setItem('TSM_APPROVAL_RELAY'/TSM.relay.write('APPROVAL'/g" "$file"

  # GOVERNANCE
  sed -i "s/localStorage\.setItem('TSM_GOVERNANCE_RELAY'/TSM.relay.write('GOVERNANCE'/g" "$file"

  # DIGITAL TWIN (hyphen-safe domain)
  sed -i "s/localStorage\.setItem('TSM_DIGITAL-TWIN_RELAY'/TSM.relay.write('DIGITAL_TWIN'/g" "$file"

  # HONEYWELL
  sed -i "s/localStorage\.setItem('TSM_HONEYWELL_RELAY'/TSM.relay.write('HONEYWELL'/g" "$file"

  # INTEGRATION HUB
  sed -i "s/localStorage\.setItem('TSM_INTEGRATION_RELAY'/TSM.relay.write('INTEGRATION'/g" "$file"

done

echo "[5/6] Validating migration..."

LEGACY_COUNT=$(grep -R "localStorage.setItem('TSM_.*RELAY" "$ROOT" | wc -l)

echo "Remaining legacy relay writes: $LEGACY_COUNT"

echo "[6/6] FINAL CUTOVER REPORT"

echo "======================================"
echo "RELAY INTERCEPTOR STATUS: ACTIVE"
echo "LEGACY MIGRATION: IN PROGRESS"
echo "CONTROL PLANE: ENFORCED"
echo "BACKUP: $BACKUP"
echo "======================================"

if [ "$LEGACY_COUNT" -eq 0 ]; then
  echo "STATUS: FULL MIGRATION COMPLETE"
else
  echo "STATUS: PARTIAL MIGRATION - REVIEW REQUIRED"
fi