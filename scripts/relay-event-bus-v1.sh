#!/usr/bin/env bash
set -e

ROOT="html/war-rooms"
CORE_DIR="$ROOT/_event_bus"
BACKUP="backup_event_bus_$(date +%s)"

echo "======================================"
echo "TSM RELAY EVENT BUS v1 BOOTSTRAP"
echo "Append-only enterprise event runtime"
echo "======================================"

echo "[1/6] Creating backup..."
cp -r "$ROOT" "$BACKUP"

echo "[2/6] Creating event bus core directory..."
mkdir -p "$CORE_DIR"

########################################
# 1. EVENT STORE (APPEND ONLY LOG)
########################################

cat > "$CORE_DIR/event-store.js" << 'EOF'
window.TSM = window.TSM || {};
TSM.eventStore = {
  log: [],

  append(event) {
    const enriched = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...event
    };

    this.log.push(enriched);

    try {
      localStorage.setItem(
        "TSM_EVENT_LOG",
        JSON.stringify(this.log)
      );
    } catch (e) {}

    return enriched;
  },

  all() {
    return this.log;
  },

  load() {
    try {
      const raw = localStorage.getItem("TSM_EVENT_LOG");
      this.log = raw ? JSON.parse(raw) : [];
    } catch (e) {
      this.log = [];
    }
  }
};

TSM.eventStore.load();
EOF

########################################
# 2. EVENT API (EMITTER)
########################################

cat > "$CORE_DIR/event-core.js" << 'EOF'
window.TSM = window.TSM || {};

TSM.event = {
  emit(type, payload) {
    return TSM.eventStore.append({
      type,
      payload