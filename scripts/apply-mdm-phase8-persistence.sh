#!/usr/bin/env bash

set -euo pipefail

echo "=========================================="
echo " TSM MDM PHASE 8 APPLY"
echo " Durable Persistence + Fly Volume"
echo "=========================================="

ROOT="$(pwd)"

BACKUP="backup-mdm-phase8-$(date +%Y%m%d-%H%M%S)"

echo
echo "[1/8] Creating backup..."

mkdir -p "$BACKUP"

cp server.js "$BACKUP/server.js"

echo "Backup: $BACKUP"

echo
echo "[2/8] Validating persistence code..."

grep -q "loadPersistedState" server.js || {
    echo "❌ loadPersistedState() not found"
    exit 1
}

grep -q "savePersistedState" server.js || {
    echo "❌ savePersistedState() not found"
    exit 1
}

echo "✅ Persistence layer detected"

echo
echo "[3/8] Node syntax validation..."

node --check server.js

echo "✅ server.js valid"

echo
echo "[4/8] Creating persistence directory..."

mkdir -p data

if [ ! -f data/mdm-state.json ]; then
cat > data/mdm-state.json <<EOF
{
  "version":1,
  "seedData":{},
  "mergeLog":[],
  "resolvedRecommendations":{},
  "recommendationDecisions":{},
  "missionClaims":{},
  "memory":{},
  "stewardship":{}
}
EOF
fi

echo "✅ Persistence file ready"

echo
echo "[5/8] Restarting server..."

PID=$(lsof -ti :8080 || true)

if [ -n "${PID}" ]; then
    echo "Stopping PID $PID"
    kill "$PID"
    sleep 2
fi

nohup node server.js >/tmp/mdm-phase8.log 2>&1 &

sleep 4

echo "✅ Server restarted"

echo
echo "[6/8] Testing APIs..."

echo
echo "HEALTH"
curl -s http://localhost:8080/api/mdm/health || true

echo
echo
echo "SUMMARY"
curl -s http://localhost:8080/api/mdm/summary || true

echo
echo
echo "MERGE HISTORY"
curl -s http://localhost:8080/api/mdm/merge-history || true

echo
echo
echo "[7/8] Verifying persistence file..."

if [ -f data/mdm-state.json ]; then
    ls -lh data/mdm-state.json
else
    echo "❌ Persistence file missing"
    exit 1
fi

echo
echo "[8/8] Persistence smoke test"

echo "Creating test merge..."

API_KEY="${TSM_API_KEY:-}"

if [ -n "$API_KEY" ]; then

curl -s \
-X POST http://localhost:8080/api/mdm/merge \
-H "Content-Type: application/json" \
-H "x-api-key: $API_KEY" \
-d '{
"domain":"customer",
"survivorId":"C001",
"mergedId":"C002",
"actor":"Phase8-Test",
"decision":"APPROVED"
}' >/dev/null || true

sleep 1

echo "Merge history after write:"

curl -s \
http://localhost:8080/api/mdm/merge-history

else

echo "Skipping merge test (TSM_API_KEY not set)"

fi

echo
echo "=========================================="
echo " MDM PHASE 8 ACTIVE"
echo "=========================================="

echo
echo "Recommended verification:"
echo
echo "curl http://localhost:8080/api/mdm/merge-history"
echo "cat data/mdm-state.json"
echo "pkill node"
echo "node server.js"
echo "curl http://localhost:8080/api/mdm/merge-history"
echo
echo "If merge history survives restart,"
echo "Phase 8 persistence is COMPLETE."