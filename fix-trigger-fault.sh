#!/bin/bash
set -e

FILE="server/enterprise-lab/api.js"

echo "== Before =="
grep -n "CATEGORY_TO_MODULE\[mission" "$FILE"

sed -i "s/CATEGORY_TO_MODULE\[mission\.category\]/CATEGORY_TO_MODULE[mission.device]/" "$FILE"

echo "== After =="
grep -n "CATEGORY_TO_MODULE\[mission" "$FILE"

echo ""
echo "Now restart your server, then run:"
echo "  curl -X POST http://localhost:8080/api/enterprise-lab/incidents/generate -H \"Content-Type: application/json\" -d '{\"category\":\"Active Directory\"}'"
echo "  curl http://localhost:8080/api/twins/chaos/status"
echo "  curl http://localhost:8080/api/twins/technicians/metrics"