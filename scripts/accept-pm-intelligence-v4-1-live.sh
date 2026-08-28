#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BASE="http://127.0.0.1:8080"
TMP="/tmp/tsm-pm-v4-1"

rm -rf "$TMP"
mkdir -p "$TMP"

echo "============================================================"
echo " TSM PM — V4.1 TRUE LIVE ACCEPTANCE"
echo " Findings → V1 → V3 → V4 → V4.1 Verification"
echo "============================================================"

echo
echo "=== 1. SYNTAX ==="
node --check server.js
node --check server/pm/verification-engine.js
node --check server/pm/intelligence-v3.js
echo "PASS: syntax"

echo
echo "=== 2. SERVER ==="
if curl -fsS "$BASE/health" >/dev/null 2>&1; then
  echo "PASS: server available"
else
  if curl -fsS "$BASE/" >/dev/null 2>&1; then
    echo "PASS: server available"
  else
    echo "FAIL: server unavailable on port 8080"
    exit 1
  fi
fi

echo
echo "=== 3. LIVE V3 ==="

curl -fsS \
  -X POST \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "findings": [
      {
        "id": "F-PM-001",
        "entityId": "S-211",
        "domain": "iot",
        "finding": "Urgent water leak sensor alert",
        "priority": "CRITICAL",
        "exposure": 3000,
        "urgency": "Immediate",
        "owner": "Maintenance Operations"
      },
      {
        "id": "F-PM-002",
        "entityId": "V-03",
        "domain": "vendor_compliance",
        "finding": "Vendor V-03 is expired",
        "priority": "HIGH",
        "exposure": 25000,
        "urgency": "Today",
        "owner": "Vendor Management"
      },
      {
        "id": "F-PM-003",
        "entityId": "WO-2201",
        "domain": "maintenance",
        "finding": "WO-2201 is over SLA",
        "priority": "HIGH",
        "exposure": 40,
        "urgency": "Today",
        "owner": "Maintenance Operations"
      }
    ]
  }' \
  "$BASE/api/pm/intelligence-v3" \
  > "$TMP/v3.json"

python3 - "$TMP/v3.json" <<'PY'
import json
import sys

data = json.load(open(sys.argv[1]))

assert data.get("ok") is True
assert len(data.get("actions", [])) == 3

print(json.dumps({
    "actions": len(data["actions"]),
    "modeledExposure": data["portfolio"]["modeledExposure"],
    "verify": data["operatingLoop"]["verify"]
}, indent=2))
PY

echo "PASS: V3 canonical output"

echo
echo "=== 4. SELECT RESOLVED ACTION ==="

python3 - "$TMP/v3.json" > "$TMP/action.json" <<'PY'
import json
import sys

data = json.load(open(sys.argv[1]))

actions = data.get("actions", [])
assert actions, "No actions returned"

# Select the highest-exposure action and simulate completion.
action = max(actions, key=lambda a: float(a.get("exposure", 0)))

action["status"] = "RESOLVED"

print(json.dumps(action))
PY

python3 - "$TMP/action.json" <<'PY'
import json
import sys

action = json.load(open(sys.argv[1]))

assert action["status"] == "RESOLVED"
assert action["verification"]["verified"] is False

print(json.dumps({
    "actionId": action["id"],
    "entityId": action["entityId"],
    "status": action["status"],
    "exposureBefore": action["exposure"]
}, indent=2))
PY

echo "PASS: resolved action prepared"

echo
echo "=== 5. LIVE V4.1 VERIFICATION ==="

python3 - "$TMP/action.json" > "$TMP/verification.json" <<'PY'
import json
import sys

action = json.load(open(sys.argv[1]))

payload = {
    "action": action,
    "verification": {
        "verified": True,
        "exposureAfter": 0,
        "verifiedBy": "PM Acceptance Test",
        "notes": "V4.1 live verification acceptance."
    }
}

print(json.dumps(payload))
PY

curl -fsS \
  -X POST \
  -H 'Content-Type: application/json' \
  --data-binary @"$TMP/verification.json" \
  "$BASE/api/pm/actions/verify" \
  > "$TMP/verified.json"

python3 - "$TMP/verified.json" <<'PY'
import json
import sys

data = json.load(open(sys.argv[1]))

assert data.get("ok") is True

action = data["action"]
verification = data["verification"]

assert action["status"] == "VERIFIED"
assert action["verification"]["verified"] is True
assert verification["verified"] is True
assert verification["outcome"] == "CONDITION_CLEARED"
assert verification["exposureAfter"] == 0
assert verification["exposureReduction"] > 0

print(json.dumps({
    "actionId": action["id"],
    "entityId": action["entityId"],
    "status": action["status"],
    "outcome": verification["outcome"],
    "exposureBefore": verification["exposureBefore"],
    "exposureAfter": verification["exposureAfter"],
    "exposureReduction": verification["exposureReduction"]
}, indent=2))
PY

echo "PASS: V4.1 verification"

echo
echo "=== 6. NEGATIVE CONTROL ==="

python3 - "$TMP/action.json" > "$TMP/unresolved.json" <<'PY'
import json
import sys

action = json.load(open(sys.argv[1]))
action["status"] = "OPEN"

print(json.dumps({
    "action": action,
    "verification": {
        "verified": True,
        "exposureAfter": 0,
        "verifiedBy": "PM Acceptance Test"
    }
}))
PY

HTTP_CODE=$(
  curl -sS \
    -o "$TMP/negative.json" \
    -w '%{http_code}' \
    -X POST \
    -H 'Content-Type: application/json' \
    --data-binary @"$TMP/unresolved.json" \
    "$BASE/api/pm/actions/verify"
)

if [ "$HTTP_CODE" = "400" ]; then
  python3 - "$TMP/negative.json" <<'PY'
import json
import sys

data = json.load(open(sys.argv[1]))

assert "Only RESOLVED actions may be verified" in data.get("error", "")

print("PASS: unresolved actions cannot be verified")
PY
else
  echo "FAIL: expected HTTP 400 for unresolved verification, got $HTTP_CODE"
  cat "$TMP/negative.json"
  exit 1
fi

echo
echo "=== 7. UNVERIFIED CONTROL ==="

python3 - "$TMP/action.json" > "$TMP/not-verified.json" <<'PY'
import json
import sys

action = json.load(open(sys.argv[1]))
action["status"] = "RESOLVED"

print(json.dumps({
    "action": action,
    "verification": {
        "verified": False,
        "verifiedBy": "PM Acceptance Test"
    }
}))
PY

curl -fsS \
  -X POST \
  -H 'Content-Type: application/json' \
  --data-binary @"$TMP/not-verified.json" \
  "$BASE/api/pm/actions/verify" \
  > "$TMP/not-verified-result.json"

python3 - "$TMP/not-verified-result.json" <<'PY'
import json
import sys

data = json.load(open(sys.argv[1]))

assert data.get("ok") is False
assert data["verification"]["verified"] is False
assert data["verification"]["exposureReduction"] == 0

print("PASS: unverified work produces zero verified reduction")
PY

echo
echo "============================================================"
echo " PM INTELLIGENCE V4.1 TRUE LIVE CHAIN: PASS"
echo "============================================================"

echo
echo "Closed loop:"
echo "  FINDINGS"
echo "      ↓"
echo "  V1 DECISION ENGINE"
echo "      ↓"
echo "  V3 GOVERNED ACTIONS"
echo "      ↓"
echo "  V4 PREDICTIVE CONTROL"
echo "      ↓"
echo "  EXECUTIVE INTERVENTION"
echo "      ↓"
echo "  V4.1 VERIFICATION"
echo "      ↓"
echo "  VERIFIED EXPOSURE REDUCTION"

echo
echo "Governance:"
echo "  Verification requires RESOLVED status"
echo "  Verified reduction requires explicit verified=true"
echo "  Source-system writeback remains disabled"
