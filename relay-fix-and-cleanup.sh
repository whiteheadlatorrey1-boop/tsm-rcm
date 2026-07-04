#!/usr/bin/env bash
set -euo pipefail

# ======================================
# TSM RELAY CORE — FIX + DEAD CODE REMOVAL — ONE SHOT
# 1) Fixes writeRelay() spreading JSON strings into garbage
# 2) Removes _tsm_relay_core.js and _relay-core.js (unused, zero call sites)
#    and strips their <script> tags from all entrypoints
# Safe to re-run.
# ======================================

ROOT="html/war-rooms"
CORE_FIX_TARGET="html/core/tsm-relay-core.js"
DEAD_FILES=("html/war-rooms/_tsm_relay_core.js" "html/war-rooms/_relay-core.js")
DEAD_FILENAMES=("_tsm_relay_core.js" "_relay-core.js")
TS=$(date +%s)
BACKUP_DIR="backup_relay_fix_and_cleanup_${TS}"

echo "======================================"
echo "TSM RELAY CORE — FIX + DEAD CODE REMOVAL"
echo "======================================"

if [ ! -d "$ROOT" ]; then
  echo "ERROR: $ROOT not found. Run this from the repo root." >&2
  exit 1
fi

echo "[1/6] Creating backup..."
mkdir -p "$BACKUP_DIR"
[ -f "$CORE_FIX_TARGET" ] && cp --parents "$CORE_FIX_TARGET" "$BACKUP_DIR/" || true
for f in "${DEAD_FILES[@]}"; do
  [ -f "$f" ] && cp --parents "$f" "$BACKUP_DIR/" || true
done
find "$ROOT" -name "*.html" -exec cp --parents {} "$BACKUP_DIR" \;
echo "  backup: $BACKUP_DIR"

echo "[2/6] Patching writeRelay() bug in $CORE_FIX_TARGET..."
if [ ! -f "$CORE_FIX_TARGET" ]; then
  echo "  WARNING: $CORE_FIX_TARGET not found, skipping patch"
elif grep -q "typeof data === \"string\"" "$CORE_FIX_TARGET"; then
  echo "  already patched, skipping"
else
  python3 - "$CORE_FIX_TARGET" <<'PYEOF'
import sys, pathlib

path = pathlib.Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

old = '''  window.writeRelay = function (vertical, payload) {
    const key = buildKey(vertical);

    const enriched = {
      ...payload,
      relayKey: key,
      timestamp: new Date().toISOString(),
      source: "TSM_RELAY_CORE"
    };'''

new = '''  window.writeRelay = function (vertical, payload) {
    const key = buildKey(vertical);

    // Callers pass either an object or a JSON string (JSON.stringify(payload)).
    // Spreading a string directly would silently produce character-indexed
    // garbage instead of the real fields, so normalize to an object first.
    let data = payload;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.error("[TSM RELAY] payload was a non-JSON string, wrapping raw:", e);
        data = { raw: data };
      }
    }

    const enriched = {
      ...data,
      relayKey: key,
      timestamp: new Date().toISOString(),
      source: "TSM_RELAY_CORE"
    };'''

if old not in text:
    print("  ERROR: expected original writeRelay block not found — file may have changed. No changes made.", file=sys.stderr)
    sys.exit(1)

text = text.replace(old, new, 1)
path.write_text(text, encoding="utf-8")
print("  patched: writeRelay() now normalizes string payloads before spreading")
PYEOF
fi

echo "[3/6] Removing dead relay-core script tags from entrypoints..."
python3 - "$ROOT" <<'PYEOF'
import re, sys, pathlib

root = pathlib.Path(sys.argv[1])
dead_names = ["_tsm_relay_core.js", "_relay-core.js"]
pattern = re.compile(
    r'[ \t]*<script[^>]+src=["\']([^"\']*(?:' +
    "|".join(re.escape(n) for n in dead_names) +
    r'))["\'][^>]*></script>[ \t]*\n?'
)

changed_files = []
for html_file in sorted(root.rglob("*.html")):
    text = html_file.read_text(encoding="utf-8")
    new_text, n = pattern.subn("", text)
    if new_text != text:
        html_file.write_text(new_text, encoding="utf-8")
        changed_files.append((str(html_file), n))

print("  stripped tags from: {} files".format(len(changed_files)))
for f, n in changed_files:
    print("    - {} ({} tag(s) removed)".format(f, n))
PYEOF

echo "[4/6] Deleting dead files..."
for f in "${DEAD_FILES[@]}"; do
  if [ -f "$f" ]; then
    rm "$f"
    echo "  removed: $f"
  else
    echo "  skip (already gone): $f"
  fi
done

echo "[5/6] Validating no dangling references remain..."
REMAINING=""
for name in "${DEAD_FILENAMES[@]}"; do
  hits=$(grep -rl "$name" "$ROOT" --include="*.html" --include="*.js" 2>/dev/null || true)
  if [ -n "$hits" ]; then
    REMAINING="$REMAINING$hits"$'\n'
  fi
done
if [ -n "$REMAINING" ]; then
  echo "  WARNING: references still found:"
  echo "$REMAINING"
else
  echo "  clean — no references to dead files remain"
fi

echo "[6/6] Confirming writeRelay patch is present..."
if [ -f "$CORE_FIX_TARGET" ] && grep -q "typeof data === \"string\"" "$CORE_FIX_TARGET"; then
  echo "  confirmed: writeRelay() patch is live"
else
  echo "  WARNING: could not confirm patch in $CORE_FIX_TARGET"
fi

echo "======================================"
echo "DONE"
echo "Backup: $BACKUP_DIR"
echo "======================================"
