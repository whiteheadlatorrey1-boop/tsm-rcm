#!/usr/bin/env bash
# Run this in your Codespace with the server already booted (MONGODB_URI set)
# on a separate terminal/process, e.g.: node server.js &
#
# Usage: ./verify-pm-lifecycle-live.sh <base_url>
#   base_url: e.g. http://localhost:8080
#
# Logs in itself using TSM_ADMIN_PASSWORD from your Codespace's own
# environment (same var server.js already reads) via a curl cookie jar --
# no manual browser/devtools cookie copying needed.
#
# Exits non-zero on the first check that doesn't match what's expected.

set -euo pipefail

BASE="${1:?usage: $0 <base_url>}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

if [ -z "${TSM_ADMIN_PASSWORD:-}" ]; then
  echo "TSM_ADMIN_PASSWORD is not set in this shell's environment."
  echo "If it's in .env, run: export \$(grep TSM_ADMIN_PASSWORD .env | xargs)"
  exit 1
fi

echo "== 0. Log in as admin, capture session cookie =="
login_resp=$(curl -s -c "$JAR" -H "Content-Type: application/json" \
  -X POST "$BASE/api/auth/login" -d "{\"password\":\"$TSM_ADMIN_PASSWORD\"}")
login_ok=$(echo "$login_resp" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).ok")
[ "$login_ok" = "true" ] || { echo "FAIL: login failed"; echo "$login_resp"; exit 1; }
echo "logged in ok"

DECISION_ID="LIVE-VERIFY-$(date +%s)"
ACTION_ID="ACT-${DECISION_ID}"

hdr=(-H "Content-Type: application/json" -b "$JAR")

echo "== 1. Seed a fresh action via intelligence-v3 (should start OPEN) =="
resp=$(curl -s "${hdr[@]}" -X POST "$BASE/api/pm/intelligence-v3" -d "{
  \"decisions\": [{
    \"id\": \"$DECISION_ID\",
    \"entityId\": \"UNIT-LIVE\",
    \"domain\": \"maintenance\",
    \"priority\": \"HIGH\",
    \"finding\": \"Live verification action\",
    \"exposure\": 1000,
    \"action\": \"n/a\",
    \"owner\": \"QA\"
  }]
}")
status=$(echo "$resp" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).actions.find(a=>a.id==='$ACTION_ID').status")
echo "status=$status"
[ "$status" = "OPEN" ] || { echo "FAIL: expected OPEN"; exit 1; }

echo "== 2. Transition OPEN -> ACKNOWLEDGED -> IN_PROGRESS -> RESOLVED =="
for next in ACKNOWLEDGED IN_PROGRESS RESOLVED; do
  resp=$(curl -s "${hdr[@]}" -X POST "$BASE/api/pm/actions/$ACTION_ID/transition" -d "{\"nextStatus\":\"$next\"}")
  got=$(echo "$resp" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).action.status")
  echo "-> $got"
  [ "$got" = "$next" ] || { echo "FAIL: expected $next, got $got"; exit 1; }
done

echo "== 3. Reload intelligence-v3 -- status must survive as RESOLVED, not reset to OPEN =="
resp=$(curl -s "${hdr[@]}" -X POST "$BASE/api/pm/intelligence-v3" -d "{
  \"decisions\": [{\"id\": \"$DECISION_ID\", \"entityId\": \"UNIT-LIVE\", \"domain\": \"maintenance\", \"priority\": \"HIGH\", \"finding\": \"Live verification action\", \"exposure\": 1000, \"action\": \"n/a\", \"owner\": \"QA\"}]
}")
status=$(echo "$resp" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).actions.find(a=>a.id==='$ACTION_ID').status")
echo "status=$status"
[ "$status" = "RESOLVED" ] || { echo "FAIL: persistence did not survive reload"; exit 1; }

echo "== 4. Verify without approval -- must be blocked (409) =="
code=$(curl -s -o /dev/null -w "%{http_code}" "${hdr[@]}" -X POST "$BASE/api/pm/actions/verify" -d "{\"actionId\":\"$ACTION_ID\",\"verification\":{\"verified\":true,\"exposureAfter\":0}}")
echo "http_code=$code"
[ "$code" = "409" ] || { echo "FAIL: expected 409 before approval"; exit 1; }

echo "== 5. Approve, then verify -- must succeed =="
curl -s "${hdr[@]}" -X POST "$BASE/api/pm/actions/$ACTION_ID/approve" -d "{}" >/dev/null
resp=$(curl -s "${hdr[@]}" -X POST "$BASE/api/pm/actions/verify" -d "{\"actionId\":\"$ACTION_ID\",\"verification\":{\"verified\":true,\"exposureAfter\":0}}")
ok=$(echo "$resp" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).ok")
echo "ok=$ok"
[ "$ok" = "true" ] || { echo "FAIL: verify did not succeed after approval"; echo "$resp"; exit 1; }

echo "== 6. Reload intelligence-v3 once more -- status must be VERIFIED =="
resp=$(curl -s "${hdr[@]}" -X POST "$BASE/api/pm/intelligence-v3" -d "{
  \"decisions\": [{\"id\": \"$DECISION_ID\", \"entityId\": \"UNIT-LIVE\", \"domain\": \"maintenance\", \"priority\": \"HIGH\", \"finding\": \"Live verification action\", \"exposure\": 1000, \"action\": \"n/a\", \"owner\": \"QA\"}]
}")
status=$(echo "$resp" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).actions.find(a=>a.id==='$ACTION_ID').status")
echo "status=$status"
[ "$status" = "VERIFIED" ] || { echo "FAIL: VERIFIED did not survive reload"; exit 1; }

echo ""
echo "=== LIVE PM LIFECYCLE VERIFICATION: ALL PASS ==="
echo "(real Mongo writes via MONGODB_URI confirmed working end to end)"
