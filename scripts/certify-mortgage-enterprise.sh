#!/bin/bash
set -e

echo "=============================================="
echo " TSM MORTGAGE ENTERPRISE CERTIFICATION"
echo "=============================================="


echo "[1/6] Validate runtime"

node --check server/mortgage/mortgage-engine.js

node --check html/shared/runtime/adapters/mortgage-runtime-adapter.js


echo "[2/6] Validate documents"

test -d demo-documents/mortgage


echo "[3/6] Start TSM server"


if ! curl -s http://localhost:8080 >/dev/null
then

echo "Starting TSM server..."

nohup node server.js > /tmp/tsm-server.log 2>&1 &

sleep 5

fi


echo "[4/6] Verify endpoint"


curl -I http://localhost:8080/html/tsm-doc-search-multi.html


echo "[5/6] Mortgage UI"

test -f html/war-rooms/mortgage/mortgage-war-room.html
test -f html/war-rooms/mortgage/mortgage-strategist.html
test -f html/war-rooms/mortgage/mortgage-executive-portal.html


echo "[6/6] Playwright"


npx playwright test tests/e2e/mortgage-end-to-end.spec.js


echo ""
echo "=============================================="
echo " MORTGAGE ENTERPRISE READY"
echo "=============================================="