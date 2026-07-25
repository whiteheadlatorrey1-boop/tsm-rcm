#!/usr/bin/env bash
set -e

echo "======================================"
echo "TSM ENTERPRISE RELAY BACKBONE v2 UPGRADE"
echo "======================================"

ROOT="html/war-rooms"
CORE_DIR="html/core"
BACKUP="backup_relay_backbone_$(date +%s)"

echo "[1/7] Creating backup snapshot..."
cp -r "$ROOT" "$BACKUP"

mkdir -p "$CORE_DIR"

echo "[2/7] Normalizing relay keys (removing hyphens)..."
find "$ROOT" -type f -name "*.html" -exec sed -i \
  -e 's/TSM_INTEGRATION-HUB_RELAY/TSM_INTEGRATION_HUB_RELAY/g' \
  -e 's/TSM_DIGITAL-TWIN_RELAY/TSM_DIGITAL_TWIN_RELAY/g' {} +

echo "[3/7] Injecting ENTERPRISE RELAY CORE..."

cat > "$CORE_DIR/tsm-relay-core.js" << 'EOF'
/**
 * TSM RELAY BACKBONE v2
 * Enterprise-grade event-driven relay system
 */

(function () {

  const EVENT_LOG_KEY = "TSM_EVENT_LOG_V1";

  function getLog() {
    try {
      return JSON.parse(localStorage.getItem(EVENT_LOG_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function writeLog(event) {
    const log = getLog();
    log.push(event);
    localStorage.setItem(EVENT_LOG_KEY, JSON.stringify(log));
  }

  function validate(payload) {
    if (!payload) throw new Error("Empty payload");

    if (!payload.vertical) throw new Error("Missing vertical");
    if (!payload.data && !payload.payload) throw new Error("Missing data");

    return true;
  }

  function buildCanonicalEvent(vertical, payload) {
    return {
      eventId: crypto.randomUUID(),
      vertical,
      type: "RELAY",
      version: "2.0",
      timestamp: new Date().toISOString(),
      correlationId: payload.correlationId || crypto.randomUUID(),
      riskScore: payload.riskScore || 0,
      confidence: payload.confidence || 1,
      data: payload
    };
  }

  window.writeRelay = function (vertical, payload) {

    validate({ vertical, data: payload });

    const event = buildCanonicalEvent(vertical, payload);
    const key = `TSM_${vertical.toUpperCase()}_RELAY`;

    try {
      sessionStorage.setItem(key, JSON.stringify(event));
      localStorage.setItem(key, JSON.stringify(event));

      writeLog(event);

      window.dispatchEvent(new CustomEvent("TSM_RELAY_EVENT", {
        detail: event
      }));

      console.log("[TSM RELAY v2]", key, event);

      return event;

    } catch (e) {
      console.error("Relay failure:", e);
      throw e;
    }
  };

  window.getRelayLog = function () {
    return getLog();
  };

})();
EOF

echo "[4/7] Injecting relay core into all war rooms..."

find "$ROOT" -type f -name "*.html" | while read file; do
  if ! grep -q "tsm-relay-core.js" "$file"; then
    sed -i 's#</head>#<script src="/html/core/tsm-relay-core.js"></script>\n</head>#' "$file"
  fi
done

echo "[5/7] Replacing unsafe storage writes with writeRelay()..."

find "$ROOT" -type f -name "*.html" -exec sed -i \
  -E 's/localStorage\.setItem\([[:space:]]*['"'"'"]TSM_([A-Z0-9_-]+)_RELAY['"'"'"][[:space:]]*,/writeRelay("\L\1",/g' \
  -E 's/sessionStorage\.setItem\([[:space:]]*['"'"'"]TSM_([A-Z0-9_-]+)_RELAY['"'"'"][[:space:]]*,/writeRelay("\L\1",/g' \
  {} +

echo "[6/7] Injecting event log accessor..."

cat > "$CORE_DIR/tsm-event-log.js" << 'EOF'
window.TSM_EVENT_LOG = {
  getAll: function () {
    return JSON.parse(localStorage.getItem("TSM_EVENT_LOG_V1") || "[]");
  },
  clear: function () {
    localStorage.removeItem("TSM_EVENT_LOG_V1");
  }
};
EOF

echo "[7/7] Validation scan..."

echo ""
echo "=== Remaining legacy hyphen keys ==="
grep -R "TSM_.*-.*_RELAY" "$ROOT" || echo "None found"

echo ""
echo "=== Remaining raw setItem relay writes ==="
grep -R "TSM_.*RELAY" "$ROOT" | grep "setItem" || echo "None found"

echo ""
echo "======================================"
echo "ENTERPRISE RELAY BACKBONE UPGRADE COMPLETE"
echo "Backup: $BACKUP"
echo "Core modules injected:"
echo "- tsm-relay-core.js (CDM + event bus + validation)"
echo "- tsm-event-log.js (audit trail)"
echo "======================================"