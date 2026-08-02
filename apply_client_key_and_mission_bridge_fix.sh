#!/usr/bin/env bash
# apply_client_key_and_mission_bridge_fix.sh
#
# Fixes two more issues found in the RCM OS prod-readiness sweep:
#
#   1. /config/tsm-client-key.js was referenced by tsm-rcm-os.html and
#      finops-showcase-v1.html but never existed anywhere, and there was
#      no server route for it. It's supposed to set window.TSM_CLIENT_KEY,
#      which html/finops-suite/js/rcm-relay-client.js sends back as the
#      x-api-key header on /api/rcm/relay. Missing it meant the FinOps Doc
#      Showcase -> RCM OS relay handoff always 401'd server-side and
#      silently fell back to localStorage-only mode.
#      Fix: serve it as a dynamic route generated from process.env.TSM_API_KEY,
#      so it can never drift out of sync with the server's own key.
#
#   2. finops-scenarios.html loads mission-bridge.js via an unqualified
#      relative path that only ever resolved to a copy living under
#      html/healthcare/ -- a different vertical. 404'd for every FinOps
#      user, silently disabling the mission-state bridge feature.
#      Fix: copy the file into html/finops-suite/ and namespace its
#      localStorage key so it can't collide with the healthcare copy
#      (same class of bug as the earlier Honeywell single-key fix).
#
# Usage: run from the repo root (where html/ and server.js live).
#   bash apply_client_key_and_mission_bridge_fix.sh
#
# Idempotent -- safe to re-run.

set -euo pipefail

if [ ! -f "server.js" ] || [ ! -d "html/finops-suite" ]; then
  echo "ERROR: run this from the repo root (server.js / html/finops-suite not found here)." >&2
  exit 1
fi

echo "== Step 1: adding /config/tsm-client-key.js server route =="
if grep -q "config/tsm-client-key.js" server.js; then
  echo "  already applied, skipping"
else
  python3 - << 'PYEOF'
import re

path = "server.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

anchor = "app.get('/health', (req, res) => res.json({ status: 'ok', v: 3 }));"
if anchor not in content:
    raise SystemExit("  ERROR: expected anchor line not found in server.js -- check manually.")

insertion = anchor + """

// Serves window.TSM_CLIENT_KEY for the browser-side relay client
// (html/finops-suite/js/rcm-relay-client.js), which sends it back as the
// x-api-key header on /api/rcm/relay (see middleware/require-api-key.js).
// Generated from the same TSM_API_KEY the server checks, instead of a
// committed static file, so client and server can never drift out of sync
// across environments. This was previously referenced as a static file at
// /config/tsm-client-key.js that never existed, 404ing on every load of
// tsm-rcm-os.html and finops-showcase-v1.html.
app.get('/config/tsm-client-key.js', (req, res) => {
  res.type('application/javascript');
  res.send(`window.TSM_CLIENT_KEY = ${JSON.stringify(process.env.TSM_API_KEY || '')};`);
});"""

content = content.replace(anchor, insertion, 1)
with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("  applied")
PYEOF
fi

echo "== Step 2: fixing mission-bridge.js path for finops-scenarios.html =="
SRC="html/healthcare/mission-bridge.js"
DEST="html/finops-suite/mission-bridge.js"

if [ ! -f "$SRC" ]; then
  echo "  ERROR: $SRC not found -- check manually." >&2
  exit 1
fi

if [ -f "$DEST" ]; then
  echo "  $DEST already exists, skipping"
else
  cp "$SRC" "$DEST"
  sed -i "s#STORAGE_KEY: 'tsm_mission_state',#  // Namespaced separately from html/healthcare/mission-bridge.js's key --\n  // same localStorage origin is shared across all open tabs, so an\n  // unqualified 'tsm_mission_state' key would let a FinOps tab and a\n  // Healthcare tab silently overwrite each other's mission state. Same\n  // class of bug as the earlier Honeywell single-key collision fix.\n  STORAGE_KEY: 'tsm_mission_state_finops',#" "$DEST"
  echo "  copied and namespaced"
fi

echo "== Done =="
echo "Verify with the server running (needs TSM_API_KEY set, or it'll serve an empty key):"
echo "  curl -s http://localhost:8080/config/tsm-client-key.js"
echo "  curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/finops-suite/mission-bridge.js"
echo "both should return content / 200, not 404."