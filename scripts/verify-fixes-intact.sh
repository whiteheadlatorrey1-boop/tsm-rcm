#!/bin/bash
set -e
echo "=========================================="
echo "Did the purge script's 'git checkout main --.' revert our fixes?"
echo "=========================================="

echo "--- server.js: Groq precedence fix still present? (should show GROQ_API_KEY first, 5 occurrences) ---"
grep -c "GROQ_API_KEY || process.env.GROQ_KEY\|GROQ_API_KEY.*||.*GROQ_KEY" server.js || echo "0 — FIX MISSING, REGRESSED"
echo "Bad old pattern (should be 0):"
grep -c "process\.env\.GROQ_KEY *|| *process\.env\.GROQ_API_KEY" server.js || echo 0

echo ""
echo "--- capability-coverage spec: single Mortgage block? (should be 1, not 2) ---"
grep -c "column: 'Mortgage'" tests/e2e/enterprise-capability-coverage.spec.js

echo ""
echo "--- git log: are our two commits still there on this branch? ---"
git log --oneline -5

echo ""
echo "--- Clean up leftover json-only directories from the purge ---"
for v in healthcare legal insurance real-estate schools; do
  echo "## html/war-rooms/$v/"
  ls html/war-rooms/$v/ 2>/dev/null
done
