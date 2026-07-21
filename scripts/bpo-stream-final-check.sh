#!/bin/bash

echo "=========================================="
echo "BPO STREAM FINAL CHECK"
echo "=========================================="

echo
echo "[1] Route definitions"
grep -R "war-room/stream" server html -n 2>/dev/null || echo "NO ROUTE FOUND"

echo
echo "[2] API files mentioning war-room"
grep -R "war-room" server -n 2>/dev/null | head -100

echo
echo "[3] Curl endpoint"
curl -s -i http://localhost:8080/api/war-room/stream | head -40

echo
echo "[4] Server processes"
ps aux | grep -E "node|npm" | grep -v grep

echo
echo "=========================================="
echo "DONE"
echo "=========================================="
