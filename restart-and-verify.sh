#!/bin/bash
set -e

PORT=8080

echo "== Killing anything on port $PORT =="
fuser -k ${PORT}/tcp 2>/dev/null || true
sleep 1

echo "== Starting server in background =="
nohup node server.js > server.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

echo "== Waiting for server to be up =="
for i in {1..15}; do
  if curl -s http://localhost:${PORT}/ -o /dev/null; then
    echo "Server is up."
    break
  fi
  sleep 1
done

echo ""
echo "== POST /incidents/generate (Active Directory) =="
curl -s -X POST http://localhost:${PORT}/api/enterprise-lab/incidents/generate \
  -H "Content-Type: application/json" \
  -d '{"category":"Active Directory"}'
echo ""

echo ""
echo "== GET /twins/chaos/status =="
curl -s http://localhost:${PORT}/api/twins/chaos/status
echo ""

echo ""
echo "== GET /twins/technicians/metrics =="
curl -s http://localhost:${PORT}/api/twins/technicians/metrics
echo ""

echo ""
echo "Server log tail (last 20 lines):"
tail -n 20 server.log