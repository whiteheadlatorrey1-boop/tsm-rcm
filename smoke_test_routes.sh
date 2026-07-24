#!/usr/bin/env bash
# Run from the repo root in your Codespace, with the server already running on :8080.
set -uo pipefail

BASE="http://localhost:8080"

echo "=== Discovering mounted routes matching relay/chat/audit in server.js ==="
grep -nE "app\.(get|post|put|use)\(" server.js | grep -iE "relay|chat|audit" || echo "(no direct matches in server.js — routes may be mounted via a router file)"

echo
echo "=== Also checking routes/ directory files for relay/chat/audit route definitions ==="
grep -rnE "router\.(get|post|put)\(" routes/ 2>/dev/null | grep -iE "relay|chat|audit"

echo
echo "=== Smoke test: hitting discovered/likely endpoints ==="
test_endpoint() {
  local method=$1
  local path=$2
  local body=${3:-'{}'}
  echo "--- $method $path ---"
  if [[ "$method" == "GET" ]]; then
    curl -s -o /tmp/resp.json -w "HTTP %{http_code}\n" "$BASE$path"
  else
    curl -s -o /tmp/resp.json -w "HTTP %{http_code}\n" -X "$method" "$BASE$path" \
      -H "Content-Type: application/json" -d "$body"
  fi
  echo "body (first 300 chars):"
  head -c 300 /tmp/resp.json
  echo
  echo
}

# Known/likely candidates based on repo history — adjust if the discovery
# section above shows different real paths.
test_endpoint POST /api/chat '{"query":"smoke test"}'
test_endpoint POST /api/audit '{"sector":"financial","query":"smoke test","output":"test"}'
test_endpoint GET  /api/audit
test_endpoint POST /api/rcm/relay '{}'
test_endpoint POST /api/rcm/guidance '{}'