#!/bin/bash
set -e
echo "=========================================="
echo "Full scope of the accidental main-revert"
echo "=========================================="

echo "--- Every tracked file that differs from THIS branch's HEAD ---"
git diff --name-status HEAD

echo ""
echo "--- Restoring ALL tracked files to HEAD (leaves untracked Category 3 alone) ---"
git checkout HEAD -- .

echo ""
echo "--- Confirm zero drift from HEAD now ---"
git diff --name-status HEAD
echo "(empty above = fully restored)"

echo ""
echo "--- Re-verify both fixes one more time ---"
grep -c "GROQ_API_KEY || process.env.GROQ_KEY" server.js
grep -c "column: 'Mortgage'" tests/e2e/enterprise-capability-coverage.spec.js
node --check server.js && echo "Syntax OK"

echo ""
echo "--- Final status ---"
git status --porcelain | awk '{print $1}' | sort | uniq -c
