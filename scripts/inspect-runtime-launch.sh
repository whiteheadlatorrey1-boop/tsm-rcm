#!/bin/bash
set -e
echo "=========================================="
echo "What does launch() actually do?"
echo "=========================================="
echo ""
echo "--- enterprise-runtime.js: full content ---"
cat html/shared/runtime/enterprise/enterprise-runtime.js
echo ""
echo "--- runtime-loader.js: full content ---"
cat html/shared/runtime/enterprise/runtime-loader.js
echo ""
echo "--- Does launch() fetch/render mission-engine, sap-phase-registry, sentinel-bridge content into #mission/#sap-phases/#sentinel? ---"
grep -n "mission\|sap-phases\|sentinel\|innerHTML\|render\|fetch(" html/shared/runtime/enterprise/enterprise-runtime.js | head -30
echo "=========================================="
