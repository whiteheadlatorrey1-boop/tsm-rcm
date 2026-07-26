#!/usr/bin/env bash
# verify-exec-portal-paths.sh
#
# Boots the server and curls all 9 exec-portal file paths that
# EXEC_PORTAL_PATHS in html/sentinel-center.html is supposed to point at,
# confirming each one actually resolves (HTTP 200) rather than being a
# dead link. This is the same check that was originally done by hand,
# vertical-by-vertical, earlier in this project -- codified here so it
# can be re-run any time instead of re-derived from scratch.
#
# NOTE: this checks that the FILES exist and are servable. It does not
# read EXEC_PORTAL_PATHS out of sentinel-center.html directly (that would
# require a JS-aware parse), so if you add a new vertical or rename a
# file again, update the PATHS array below to match.
#
# Exits non-zero if any path fails, so this is CI/script-friendly.
#
# Usage:
#   chmod +x verify-exec-portal-paths.sh
#   ./verify-exec-portal-paths.sh
#
# Run from the repo root (tsm-rcm/).

set -uo pipefail  # deliberately no -e: we want to run every check even if one fails

if [ ! -f "server.js" ]; then
  echo "❌ server.js not found in $(pwd) -- run this from the repo root." >&2
  exit 1
fi

PORT="${PORT:-8080}"

# Known-good relative paths (confirmed via curl earlier in this project).
declare -a PATHS=(
  "war-rooms/schools-command/schools-executive-portal.html"
  "war-rooms/mortgage/mortgage-executive-portal.html"
  "war-rooms/construct-war/construction-executive-portal.html"
  "war-rooms/legal-war/legal-executive-portal.html"
  "war-rooms/insure-war/insurance-executive-portal.html"
  "war-rooms/bpo-war/bpo-executive-portal.html"
  "war-rooms/re-war/re-exec-portal.html"
  "healthcare/executive-portal.html"
  "finops-suite/finops-war/finops-executive-portal.html"
)

STARTED_SERVER=0
if ! curl -sf "http://localhost:$PORT/api/enterprise/health" > /dev/null 2>&1; then
  echo "Booting server on port $PORT..."
  (PORT="$PORT" node server.js > /tmp/tsm-server-verify.log 2>&1 &)
  STARTED_SERVER=1
  sleep 3
  if ! curl -sf "http://localhost:$PORT/api/enterprise/health" > /dev/null 2>&1; then
    echo "❌ Server didn't come up cleanly. Log:"
    cat /tmp/tsm-server-verify.log
    exit 1
  fi
fi
echo "✅ Server is up on port $PORT."
echo ""

FAIL_COUNT=0
for p in "${PATHS[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/html/$p")
  if [ "$code" = "200" ]; then
    echo "  200  $p"
  else
    echo "  $code  $p   <-- FAILED"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
done

if [ "$STARTED_SERVER" = "1" ]; then
  pkill -f "node server.js" 2>/dev/null || true
fi

echo ""
if [ "$FAIL_COUNT" -eq 0 ]; then
  echo "✅ All 9 exec-portal paths resolve."
  exit 0
else
  echo "❌ $FAIL_COUNT of 9 exec-portal paths failed to resolve."
  exit 1
fi