#!/bin/bash
set -e
echo "=========================================="
echo "Restoring server.js and capability spec to THIS branch's committed state"
echo "=========================================="

git checkout HEAD -- server.js tests/e2e/enterprise-capability-coverage.spec.js

echo "--- Verify: Groq precedence fix restored? ---"
grep -c "GROQ_API_KEY || process.env.GROQ_KEY" server.js
echo "Bad pattern (should be 0):"
grep -c "process\.env\.GROQ_KEY *|| *process\.env\.GROQ_API_KEY" server.js || echo 0

echo ""
echo "--- Verify: single Mortgage block restored? ---"
grep -c "column: 'Mortgage'" tests/e2e/enterprise-capability-coverage.spec.js

echo ""
echo "--- node --check server.js ---"
node --check server.js && echo "Syntax OK"

echo ""
echo "--- Clean up leftover scenarios.json/workflow.json orphans from the aborted migration ---"
rm -rf html/war-rooms/healthcare html/war-rooms/legal html/war-rooms/insurance html/war-rooms/real-estate html/war-rooms/schools

echo ""
echo "--- Final status ---"
git status --porcelain | wc -l
git status --porcelain | awk '{print $1}' | sort | uniq -c
