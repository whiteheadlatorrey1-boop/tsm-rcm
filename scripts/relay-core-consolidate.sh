#!/usr/bin/env bash
set -euo pipefail

# ======================================
# TSM RELAY CORE CONSOLIDATION — ONE SHOT
# Replaces relay.interceptor.js + relay.guard.js + relay.normalize.js
# with a single relay.core.js, and rewrites all entrypoint <script> tags.
# Safe to re-run (idempotent): if there's nothing left to change, it says so.
# ======================================

ROOT="html/war-rooms"
CP_DIR="$ROOT/_relay_control_plane"
CORE_FILE="$CP_DIR/relay.core.js"
OLD_FILES=("relay.interceptor.js" "relay.guard.js" "relay.normalize.js")
TS=$(date +%s)
BACKUP_DIR="backup_relay_core_consolidation_${TS}"

echo "======================================"
echo "TSM RELAY CORE CONSOLIDATION — ONE SHOT"
echo "======================================"

if [ ! -d "$ROOT" ]; then
  echo "ERROR: $ROOT not found. Run this from the repo root." >&2
  exit 1
fi

echo "[1/5] Creating backup..."
mkdir -p "$BACKUP_DIR"
[ -d "$CP_DIR" ] && cp -r "$CP_DIR" "$BACKUP_DIR/_relay_control_plane_before" || true
find "$ROOT" -name "*.html" -exec cp --parents {} "$BACKUP_DIR" \;
echo "  backup: $BACKUP_DIR"

echo "[2/5] Writing relay.core.js (idempotent write)..."
mkdir -p "$CP_DIR"
cat > "$CORE_FILE" <<'JSEOF'
/**
 * TSM Relay Core (Runtime Enforcement + Audit Log)
 * Single write path for all war-room relay traffic.
 * Consolidates the three legacy control-plane scripts into one.
 */
(function (global) {
  const RELAY_REGISTRY = {
    CRM: "TSM_CRM_RELAY",
    CPQ: "TSM_CPQ_RELAY",
    BPO: "TSM_BPO_RELAY",
    O2C: "TSM_O2C_RELAY",
    MDM: "TSM_MDM_RELAY",
    APPROVAL: "TSM_APPROVAL_RELAY",
    CATALOG: "TSM_CATALOG_RELAY",
    GOVERNANCE: "TSM_GOVERNANCE_RELAY",
    DIGITAL_TWIN: "TSM_DIGITAL_TWIN_RELAY",
    HONEYWELL: "TSM_HONEYWELL_RELAY",
    INTEGRATION: "TSM_INTEGRATION_HUB_RELAY"
  };
  const EVENT_LOG_KEY = "TSM_EVENT_LOG";
  const EVENT_LOG_MAX = 500;

  function now() { return new Date().toISOString(); }

  function appendEvent(domain, key, payload) {
    let log = [];
    try { log = JSON.parse(localStorage.getItem(EVENT_LOG_KEY) || "[]"); } catch (e) { log = []; }
    log.push({ ts: now(), domain, key, id: payload.id || null });
    if (log.length > EVENT_LOG_MAX) log = log.slice(log.length - EVENT_LOG_MAX);
    try { localStorage.setItem(EVENT_LOG_KEY, JSON.stringify(log)); } catch (e) {}
  }

  function write(domain, payload) {
    const key = RELAY_REGISTRY[domain];
    if (!key) throw new Error("Unknown relay domain: " + domain);
    if (!payload) throw new Error("Relay payload missing for " + domain);

    payload.timestamp = payload.timestamp || now();
    payload.id = payload.id || Math.random().toString(36).slice(2);

    const json = JSON.stringify(payload);
    localStorage.setItem(key, json);
    sessionStorage.setItem(key, json);
    appendEvent(domain, key, payload);

    try {
      global.dispatchEvent(new CustomEvent("TSM_RELAY_EVENT", { detail: { domain, payload } }));
    } catch (e) {}

    return payload;
  }

  function read(domain) {
    const key = RELAY_REGISTRY[domain];
    if (!key) return null;
    try {
      return JSON.parse(localStorage.getItem(key) || sessionStorage.getItem(key) || "null");
    } catch (e) { return null; }
  }

  function eventLog() {
    try { return JSON.parse(localStorage.getItem(EVENT_LOG_KEY) || "[]"); } catch (e) { return []; }
  }

  global.TSM = global.TSM || {};
  global.TSM.relay = { write, read, eventLog, domains: Object.keys(RELAY_REGISTRY) };

  console.log("[TSM RELAY CORE] Active");
})(window);
JSEOF
echo "  written: $CORE_FILE"

echo "[3/5] Rewriting entrypoint script tags..."
python3 - "$ROOT" <<'PYEOF'
import re, sys, pathlib

root = pathlib.Path(sys.argv[1])
old_names = ["relay.interceptor.js", "relay.guard.js", "relay.normalize.js"]
pattern = re.compile(
    r'[ \t]*<script[^>]+src=["\']([^"\']*(?:' +
    "|".join(re.escape(n) for n in old_names) +
    r'))["\'][^>]*></script>[ \t]*\n?'
)

changed_files = []
already_clean = []

for html_file in sorted(root.rglob("*.html")):
    text = html_file.read_text(encoding="utf-8")
    matches = list(pattern.finditer(text))
    if not matches:
        continue

    first_src = matches[0].group(1)
    prefix = first_src.rsplit("/", 1)[0] + "/" if "/" in first_src else ""
    new_tag = '    <script src="{}relay.core.js"></script>\n'.format(prefix)

    counter = {"n": 0}
    def repl(m, counter=counter, new_tag=new_tag):
        counter["n"] += 1
        return new_tag if counter["n"] == 1 else ""

    new_text = pattern.sub(repl, text)

    if new_text != text:
        html_file.write_text(new_text, encoding="utf-8")
        changed_files.append(str(html_file))

print("  rewritten: {} files".format(len(changed_files)))
for f in changed_files:
    print("    - {}".format(f))
PYEOF

echo "[4/5] Removing old control-plane files..."
for f in "${OLD_FILES[@]}"; do
  target="$CP_DIR/$f"
  if [ -f "$target" ]; then
    rm "$target"
    echo "  removed: $target"
  else
    echo "  skip (already gone): $target"
  fi
done

echo "[5/6] Validating no dangling references remain..."
REMAINING=$(grep -rl "relay\.interceptor\.js\|relay\.guard\.js\|relay\.normalize\.js" "$ROOT" --include="*.html" --include="*.js" 2>/dev/null | grep -v "relay.core.js$" || true)
if [ -n "$REMAINING" ]; then
  echo "  WARNING: references still found in:"
  echo "$REMAINING"
else
  echo "  clean — no references to old files remain"
fi

CORE_REFS=$(grep -rl "relay\.core\.js" "$ROOT" --include="*.html" 2>/dev/null | wc -l | tr -d ' ')
echo "[6/6] Entrypoints now loading relay.core.js: $CORE_REFS"

echo "======================================"
echo "DONE"
echo "Backup: $BACKUP_DIR"
echo "======================================"