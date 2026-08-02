#!/bin/bash
echo "[+] Starting TSM Security & Console Patch..."

# 1. Locate and patch re-war-room.html / relay reader to sanitize docText
WAR_ROOM_FILE="html/war-rooms/re-war/re-war-room.html"
if [ -f "$WAR_ROOM_FILE" ]; then
    echo "[+] Patching relay reader in $WAR_ROOM_FILE..."
    # Insert sanitization wrapper for session storage payloads
    sed -i 's/sessionStorage.setItem('\''TSM_RE_WAR_RELAY'\'',/sessionStorage.setItem('\''TSM_RE_WAR_RELAY'\'', JSON.stringify(Object.assign({}, JSON.parse(arguments[0]||'\''{}'\''), {docText: undefined, docTextPreview: (arguments[0]?.docText || '''').substring(0, 100) + '\'' [SANITIZED]'\''})),/g' "$WAR_ROOM_FILE"
fi

# 2. Patch console warning for store state in kernel/relay core
KERNEL_FILE="html/war-rooms/re-war/js/tsm-kernel-upgrade.js"
if [ -f "$KERNEL_FILE" ]; then
    echo "[+] Patching store state check in $KERNEL_FILE..."
    sed -i 's/if (!store.state)/if (!store || (!store.state && typeof store.getState !== '\''function'\''))/g' "$KERNEL_FILE"
fi

echo "[+] Patching complete. Please restart your Node server or refresh your browser."
