#!/usr/bin/env bash
# One-shot runner for the Stage-2 v2 platform gap audit.
#
# Does everything by hand that kept going wrong across separate terminals:
#   1. Kills any stale `node server.js` still bound to the port (the most
#      likely reason the login password didn't match — an old process
#      from an earlier attempt was still the one actually listening).
#   2. Starts a single fresh server instance with the password/secret you
#      pass in, in the background, logging to a tmp file.
#   3. Polls until it's actually up instead of a fixed sleep.
#   4. Verifies login actually succeeds BEFORE running the full audit —
#      fails fast with the server's own error message if not, instead of
#      quietly falling back to an unauthenticated run.
#   5. Runs scripts/platform-gap-audit-v2.js.
#   6. Kills the server it started (never touches a server it didn't
#      start — see the pre-flight check below) and prints the report.
#
# Usage (from repo root):
#   set +H   # once, if your shell has history expansion on (avoids `!`
#            # in the password being mangled — see below)
#   TSM_ADMIN_PASSWORD='Zyheir2016!' TSM_SESSION_SECRET='<your secret>' \
#     bash scripts/run-full-audit.sh
#
# If TSM_SESSION_SECRET isn't already something you have on hand, any
# non-empty string works for a local audit run — it only needs to match
# between the server this script starts and itself, not anything else.

set -uo pipefail

PORT="${PORT:-8080}"
BASE_URL="http://localhost:${PORT}"
SERVER_LOG="$(mktemp /tmp/tsm-audit-server.XXXXXX.log)"
STARTED_SERVER=0
SERVER_PID=""

log() { echo "[run-full-audit] $*"; }

cleanup() {
  if [ "$STARTED_SERVER" = "1" ] && [ -n "$SERVER_PID" ]; then
    log "stopping server (pid $SERVER_PID) that this script started..."
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if [ -z "${TSM_ADMIN_PASSWORD:-}" ]; then
  echo "ERROR: TSM_ADMIN_PASSWORD is not set. Example:"
  echo "  TSM_ADMIN_PASSWORD='Zyheir2016!' TSM_SESSION_SECRET='some-secret' bash scripts/run-full-audit.sh"
  exit 1
fi
if [ -z "${TSM_SESSION_SECRET:-}" ]; then
  echo "ERROR: TSM_SESSION_SECRET is not set (needed to sign/verify the session)."
  echo "  TSM_ADMIN_PASSWORD='Zyheir2016!' TSM_SESSION_SECRET='some-secret' bash scripts/run-full-audit.sh"
  exit 1
fi

# ── 1. Clear any stale server already bound to the port ────────────────
EXISTING_PID="$(pgrep -f "node[^&]*server\.js" || true)"
if [ -n "$EXISTING_PID" ]; then
  log "found existing server process(es): $EXISTING_PID"
  log "killing so this run starts from a known-clean state..."
  kill $EXISTING_PID 2>/dev/null || true
  sleep 1
  kill -9 $EXISTING_PID 2>/dev/null || true
fi

# ── 2. Start a fresh server with the password/secret you gave us ───────
log "starting server on port $PORT (log: $SERVER_LOG)..."
TSM_ADMIN_PASSWORD="$TSM_ADMIN_PASSWORD" TSM_SESSION_SECRET="$TSM_SESSION_SECRET" PORT="$PORT" \
  node server.js > "$SERVER_LOG" 2>&1 &
SERVER_PID=$!
STARTED_SERVER=1

# ── 3. Poll until it's actually up (max ~15s) ───────────────────────────
UP=0
for i in $(seq 1 30); do
  if curl -s -o /dev/null "$BASE_URL/"; then
    UP=1
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    log "server process died on startup. Log follows:"
    cat "$SERVER_LOG"
    exit 1
  fi
  sleep 0.5
done
if [ "$UP" != "1" ]; then
  log "server never came up after 15s. Log follows:"
  cat "$SERVER_LOG"
  exit 1
fi
log "server is up."

# ── 4. Verify login actually works before running the full audit ──────
LOGIN_RESP="$(curl -s -w '\n%{http_code}' -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"${TSM_ADMIN_PASSWORD}\"}")"
LOGIN_BODY="$(echo "$LOGIN_RESP" | head -n -1)"
LOGIN_CODE="$(echo "$LOGIN_RESP" | tail -n1)"

if [ "$LOGIN_CODE" != "200" ]; then
  log "login check FAILED (HTTP $LOGIN_CODE): $LOGIN_BODY"
  log "this means the server this script just started does not accept"
  log "the TSM_ADMIN_PASSWORD you passed in — the value itself is wrong"
  log "(check for a .env file overriding it, or a typo), not a stale-"
  log "process issue this time, since we just started this one ourselves."
  exit 1
fi
log "login check OK — proceeding authenticated."

# ── 5. Run the actual audit ─────────────────────────────────────────────
log "running platform-gap-audit-v2.js..."
TSM_ADMIN_PASSWORD="$TSM_ADMIN_PASSWORD" TSM_AUDIT_BASE_URL="$BASE_URL" \
  node scripts/platform-gap-audit-v2.js
AUDIT_EXIT=$?

if [ "$AUDIT_EXIT" != "0" ]; then
  log "audit script exited non-zero ($AUDIT_EXIT). Server log follows:"
  cat "$SERVER_LOG"
  exit "$AUDIT_EXIT"
fi

# ── 6. Print the report ─────────────────────────────────────────────────
REPORT="audit-output-verticals/report-v2.md"
if [ -f "$REPORT" ]; then
  log "done. Report:"
  echo "════════════════════════════════════════════════════════════════"
  cat "$REPORT"
  echo "════════════════════════════════════════════════════════════════"
else
  log "audit script exited 0 but $REPORT wasn't found — check its own output above."
fi
