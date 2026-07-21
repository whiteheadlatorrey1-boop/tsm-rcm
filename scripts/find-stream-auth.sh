#!/bin/bash

echo "=========================================="
echo "TSM STREAM AUTH FORENSICS"
echo "=========================================="

echo
echo "[1] Route context"
sed -n '400,520p' server.js

echo
echo "[2] Search API key patterns everywhere"
grep -RniE "apikey|api-key|api_key|authorization|bearer|invalid|key|token|secret" server.js server 2>/dev/null | head -200

echo
echo "[3] Search environment checks"
grep -RniE "process\.env|dotenv|env\." server.js server 2>/dev/null | head -200

echo
echo "[4] Active server command"
ps aux | grep "node server.js" | grep -v grep

echo
echo "=========================================="
echo "DONE"
echo "=========================================="
