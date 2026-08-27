#!/usr/bin/env bash
set -euo pipefail

: "${TSM_ADMIN_PASSWORD:?TSM_ADMIN_PASSWORD is not set in this shell.}"

BASE_URL="${1:-http://localhost:8080}"
COOKIE_JAR="$(mktemp)"

echo "== Logging in as admin =="
curl -s -c "$COOKIE_JAR" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  --data-binary @<(printf '{"password":"%s"}' "$TSM_ADMIN_PASSWORD")
echo
echo

echo "== Minting GCU Pilot client access code =="
curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/api/admin/clients" \
  -H "Content-Type: application/json" \
  --data-binary '{"label":"GCU Pilot"}'
echo

rm -f "$COOKIE_JAR"
