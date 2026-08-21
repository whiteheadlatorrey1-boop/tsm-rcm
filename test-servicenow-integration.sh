#!/usr/bin/env bash
set -euo pipefail

: "${SN_URL:?Set SN_URL, e.g. https://dev341015.service-now.com}"
: "${SN_USER:?Set SN_USER, e.g. admin}"
: "${SN_PASS:?Set SN_PASS to your PDI password}"
: "${TSM_URL:?Set TSM_URL, e.g. https://tsm-consultz.fly.dev}"
CF_GATE_HEADER=()
if [ -n "${CF_GATE_SECRET:-}" ]; then
  CF_GATE_HEADER=(-H "x-tsm-cf-gate: $CF_GATE_SECRET")
fi

ASSET_TAG="TEST-LT-$(date +%s | tail -c 5)"
echo "== Using asset tag: $ASSET_TAG =="

echo
echo "1) Creating test hardware CI on ServiceNow..."
CI_RESP=$(curl -s -u "$SN_USER:$SN_PASS" \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -X POST "$SN_URL/api/now/table/cmdb_ci_hardware" \
  -d "{\"asset_tag\":\"$ASSET_TAG\",\"name\":\"L1 Copilot Test Laptop\",\"install_status\":\"1\"}")
echo "$CI_RESP"
CI_SYS_ID=$(echo "$CI_RESP" | grep -o '"sys_id":"[a-f0-9]*"' | head -1 | cut -d'"' -f4)
echo "Created CI sys_id: $CI_SYS_ID"

echo
echo "2) Creating test incident on ServiceNow..."
INC_RESP=$(curl -s -u "$SN_USER:$SN_PASS" \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -X POST "$SN_URL/api/now/table/incident" \
  -d "{\"short_description\":\"L1 Copilot integration test\",\"priority\":\"3\",\"cmdb_ci\":\"$CI_SYS_ID\"}")
echo "$INC_RESP"
INC_NUMBER=$(echo "$INC_RESP" | grep -o '"number":"[A-Z0-9]*"' | head -1 | cut -d'"' -f4)
INC_SYS_ID=$(echo "$INC_RESP" | grep -o '"sys_id":"[a-f0-9]*"' | head -1 | cut -d'"' -f4)
echo "Created incident: $INC_NUMBER (sys_id: $INC_SYS_ID)"

if [ -z "$CI_SYS_ID" ] || [ -z "$INC_NUMBER" ]; then
  echo "!! Seeding failed — check SN_URL/SN_USER/SN_PASS and try again." >&2
  exit 1
fi

echo
echo "== Now testing TSM L1 Copilot ServiceNow routes against this real data =="

echo
echo "3) GET /status"
curl -s "${CF_GATE_HEADER[@]}" "$TSM_URL/api/l1-copilot/servicenow/status"; echo

echo
echo "4) GET /asset/$ASSET_TAG"
curl -s "${CF_GATE_HEADER[@]}" "$TSM_URL/api/l1-copilot/servicenow/asset/$ASSET_TAG"; echo

echo
echo "5) GET /ticket/$INC_NUMBER"
curl -s "${CF_GATE_HEADER[@]}" "$TSM_URL/api/l1-copilot/servicenow/ticket/$INC_NUMBER"; echo

echo
echo "6) POST /work-note"
curl -s "${CF_GATE_HEADER[@]}" -X POST "$TSM_URL/api/l1-copilot/servicenow/work-note" \
  -H "Content-Type: application/json" \
  -d "{\"incident\":\"$INC_NUMBER\",\"note\":\"L1 Copilot live integration test - $(date -u +%FT%TZ)\"}"; echo

echo
echo "7) POST /status-update (set to In Progress = 2)"
curl -s "${CF_GATE_HEADER[@]}" -X POST "$TSM_URL/api/l1-copilot/servicenow/status-update" \
  -H "Content-Type: application/json" \
  -d "{\"incident\":\"$INC_NUMBER\",\"state\":\"2\"}"; echo

echo
echo "== Done. Verify in ServiceNow UI: =="
echo "   Incident: $SN_URL/nav_to.do?uri=incident.do?sys_id=$INC_SYS_ID"
echo "   -> work_notes should show the L1 Copilot note, state should read In Progress."
echo "   CI: $SN_URL/nav_to.do?uri=cmdb_ci_hardware.do?sys_id=$CI_SYS_ID"
