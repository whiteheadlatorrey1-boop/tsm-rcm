#!/usr/bin/env bash
set -euo pipefail

ROOT="html/war-rooms"
CORE="$ROOT/_event_bus"
BACKUP="backup_event_bus_$(date +%s)"

echo "======================================"
echo "TSM EVENT BUS v1 - ONE SHOT APPLY"
echo "Enterprise deterministic convergence"
echo "======================================"

#####################################
# 1. BACKUP
#####################################
echo "[1/6] Backup..."
cp -r "$ROOT" "$BACKUP"

#####################################
# 2. CREATE EVENT BUS CORE
#####################################
echo "[2/6] Building event bus core..."

mkdir -p "$CORE"

cat > "$CORE/event-store.js" << 'EOF'
window.TSM = window.TSM || {};

TSM.eventStore = {
  log: [],

  append(event) {
    const record = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...event
    };

    this.log.push(record);

    try {
      localStorage.setItem("TSM_EVENT_LOG", JSON.stringify(this.log));
    } catch (e) {}

    return record;
  },

  load() {
    try {
      const raw = localStorage.getItem("TSM_EVENT_LOG");
      this.log = raw ? JSON.parse(raw) : [];
    } catch (e) {
      this.log = [];
    }
  },

  all() {
    return this.log;
  }
};

TSM.eventStore.load();
EOF

cat > "$CORE/event-core.js" << 'EOF'
window.TSM = window.TSM || {};

TSM.event = {
  emit(type, payload) {
    return TSM.eventStore.append({ type, payload });
  },

  replay(filterFn) {
    const events = TSM.eventStore.all();
    return filterFn ? events.filter(filterFn) : events;
  }
};
EOF

cat > "$CORE/relay-adapter.js" << 'EOF'
window.TSM = window.TSM || {};

TSM.relay = {
  write(domain, payload) {
    return TSM.event.emit("RELAY_WRITE", { domain, payload });
  }
};
EOF

cat > "$CORE/event-schema.js" << 'EOF'
window.TSM = window.TSM || {};

TSM.schema = {
  validate(event) {
    if (!event.type) throw new Error("Missing event type");
    if (!event.payload) throw new Error("Missing payload");
    return true;
  }
};
EOF

cat > "$CORE/bootstrap.js" << 'EOF'
(function () {
  window.TSM = window.TSM || {};
  console.log("[TSM EVENT BUS] ACTIVE");
})();
EOF

#####################################
# 3. SAFE HTML INJECTION (NO SED)
#####################################
echo "[3/6] Injecting event bus into entrypoints..."

INJECT=$(cat <<'EOF'
<script src="/html/war-rooms/_event_bus/event-store.js"></script>
<script src="/html/war-rooms/_event_bus/event-core.js"></script>
<script src="/html/war-rooms/_event_bus/relay-adapter.js"></script>
<script src="/html/war-rooms/_event_bus/event-schema.js"></script>
<script src="/html/war-rooms/_event_bus/bootstrap.js"></script>
EOF
)

find "$ROOT" -name "*.html" | while read file; do
  if ! grep -q "event-core.js" "$file"; then
    awk -v inject="$INJECT" '
      BEGIN { inserted=0 }
      /<head>/ && inserted==0 {
        print $0
        print inject
        inserted=1
        next
      }
      { print $0 }
    ' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
  fi
done

#####################################
# 4. SAFE MIGRATION (PERL ONLY)
#####################################
echo "[4/6] Migrating legacy storage → event bus..."

find "$ROOT" -type f \( -name "*.html" -o -name "*.js" \) | while read file; do
  perl -pi -e '
    s/localStorage\.setItem\(["'\'"]TSM_([A-Z0-9_-]*)_RELAY["'\'"]\s*,/TSM.relay.write("$1",/g;
    s/sessionStorage\.setItem\(["'\'"]TSM_([A-Z0-9_-]*)_RELAY["'\'"]\s*,/TSM.relay.write("$1",/g;
  ' "$file"
done

#####################################
# 5. VALIDATION
#####################################
echo "[5/6] Validation scan..."

LEFTOVER=$(grep -R "localStorage.setItem.*TSM_" "$ROOT" || true)

if [ -n "$LEFTOVER" ]; then
  echo "⚠️ Legacy writes still detected:"
  echo "$LEFTOVER"
else
  echo "✅ All legacy storage writes migrated successfully."
fi

#####################################
# 6. FINAL REPORT
#####################################
echo "[6/6] Final report"

echo "======================================"
echo "EVENT BUS STATUS: ACTIVE"
echo "ARCHITECTURE: EVENT-SOURCED"
echo "RELAY API: TSM.relay.write()"
echo "EVENT API: TSM.event.emit()"
echo "BACKUP: $BACKUP"

