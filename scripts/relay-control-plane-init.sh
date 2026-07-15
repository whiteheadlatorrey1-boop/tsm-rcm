#!/usr/bin/env bash
set -euo pipefail

ROOT="html/war-rooms"
CORE="$ROOT/_relay_control_plane"
mkdir -p "$CORE"

echo "======================================"
echo "TSM RELAY CONTROL PLANE v1 INIT"
echo "Building governance + runtime protection layer"
echo "======================================"

echo "[1/4] Creating relay schema registry..."

cat > "$CORE/relay.schema.json" << 'EOF'
{
  "version": "1.0",
  "pattern": "^TSM_[A-Z0-9_]+_RELAY$",
  "allowed_prefixes": [
    "TSM_APPROVAL",
    "TSM_BPO",
    "TSM_CRM",
    "TSM_CATALOG",
    "TSM_CPQ",
    "TSM_GOVERNANCE",
    "TSM_MDM",
    "TSM_O2C",
    "TSM_HONEYWELL",
    "TSM_DIGITAL_TWIN",
    "TSM_INTEGRATION_HUB",
    "TSM_HC_WAR",
    "TSM_INS_WAR",
    "TSM_RE_WAR",
    "TSM_CONSTRUCTION_WAR",
    "TSM_LEGAL_WAR"
  ],
  "rules": {
    "no_hyphens": true,
    "underscore_only": true,
    "must_end_with": "_RELAY"
  }
}
EOF

echo "[2/4] Creating runtime relay guard..."

cat > "$CORE/relay.guard.js" << 'EOF'
/**
 * TSM Relay Guard (Runtime Enforcement Layer)
 * Prevents invalid relay keys at runtime
 */

const RelaySchema = {
  pattern: /^TSM_[A-Z0-9_]+_RELAY$/,
  validate(key) {
    return this.pattern.test(key);
  }
};

function assertRelayKey(key) {
  if (!RelaySchema.validate(key)) {
    console.error("[TSM RELAY GUARD] Invalid relay key blocked:", key);
    throw new Error("Invalid Relay Key: " + key);
  }
  return true;
}

const _setItem = Storage.prototype.setItem;

Storage.prototype.setItem = function(key, value) {
  if (typeof key === "string" && key.startsWith("TSM_") && key.includes("RELAY")) {
    assertRelayKey(key);
  }
  return _setItem.apply(this, arguments);
};

console.log("[TSM RELAY GUARD] Active");
EOF

echo "[3/4] Creating auto-normalizer (legacy drift fixer)..."

cat > "$CORE/relay.normalize.js" << 'EOF'
/**
 * TSM Relay Auto-Normalizer
 * Fixes legacy hyphen drift at runtime
 */

function normalizeRelayKey(key) {
  if (!key) return key;
  if (!key.includes("RELAY")) return key;
  return key.replace(/-/g, "_");
}

function safeSetRelay(key, value) {
  const normalized = normalizeRelayKey(key);
  return localStorage.setItem(normalized, value);
}

function safeGetRelay(key) {
  const normalized = normalizeRelayKey(key);
  return localStorage.getItem(normalized);
}

window.TSMRelay = {
  set: safeSetRelay,
  get: safeGetRelay,
  normalize: normalizeRelayKey
};

console.log("[TSM RELAY NORMALIZER] Active");
EOF

echo "[4/4] Creating CI enforcement rule..."

cat > "$CORE/relay.ci.rules.txt" << 'EOF'
TSM RELAY GOVERNANCE RULES

1. All relay keys must match:
   ^TSM_[A-Z0-9_]+_RELAY$

2. Hyphens are forbidden in runtime keys

3. localStorage/sessionStorage must only use canonical keys

4. UI text may contain examples but must NOT be validated

5. Any violation fails build gate
EOF

echo ""
echo "======================================"
echo "CONTROL PLANE CREATED"
echo "Location: $CORE"
echo ""
echo "NEXT STEP:"
echo "Add to HTML entrypoints:"
echo "<script src='_relay_control_plane/relay.guard.js'></script>"
echo "<script src='_relay_control_plane/relay.normalize.js'></script>"
echo "======================================"