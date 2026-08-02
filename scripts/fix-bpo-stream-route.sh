#!/bin/bash

set -e

echo "=========================================="
echo "BPO STREAM ROUTE DIAGNOSTIC"
echo "=========================================="

echo
echo "Searching backend route..."

grep -R "war-room/stream" server html -n || true

echo
echo "Searching stream handlers..."

grep -R "stream" server -n | head -50 || true

echo
echo "Checking API response..."

curl -i http://localhost:8080/api/war-room/stream || true

echo
echo "Checking running services..."

ps aux | grep node | grep -v grep || true

echo
echo "=========================================="
echo "BPO STREAM CHECK COMPLETE"
echo "=========================================="

