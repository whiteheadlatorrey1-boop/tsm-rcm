#!/usr/bin/env bash

set -euo pipefail

echo "======================================"
echo " TSM MDM PHASE 4 APPLY"
echo " Autonomous Governance Layer"
echo "======================================"

echo "[1/6] Backup server.js"

BACKUP="backup-mdm-phase4-$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP"

cp server.js "$BACKUP/server.js"

echo "Backup: $BACKUP"


echo "[2/6] Checking Phase 4 routes"

grep -q "api/mdm/stewardship" server.js || {
 echo "❌ stewardship route missing"
 exit 1
}

grep -q "api/mdm/memory" server.js || {
 echo "❌ memory route missing"
 exit 1
}

echo "✅ Phase 4 routes detected"


echo "[3/6] Node syntax validation"

node --check server.js

echo "✅ server.js valid"


echo "[4/6] Restarting Node server"

PID=$(lsof -ti :8080 || true)

if [ -n "$PID" ]; then
    echo "Stopping existing server PID $PID"
    kill $PID
    sleep 3
fi


echo "[5/6] Starting server"

nohup node server.js > mdm-phase4.log 2>&1 &

sleep 5


echo "[6/6] Testing Phase 4 APIs"

echo ""
echo "HEALTH"
curl -s http://localhost:8080/api/mdm/health

echo ""
echo ""

echo "STEWARDSHIP"
curl -s http://localhost:8080/api/mdm/stewardship

echo ""
echo ""

echo "MEMORY"
curl -s http://localhost:8080/api/mdm/memory

echo ""

echo "======================================"
echo " MDM PHASE 4 ACTIVE"
echo "======================================"
