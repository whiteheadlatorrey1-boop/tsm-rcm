#!/bin/bash
set -e
echo "=========================================="
echo "Remove main-origin contamination + final verify"
echo "=========================================="

echo "--- What is this file? (quick sanity check before removing) ---"
head -20 html/js/tsm-mission-engine.js 2>/dev/null || echo "(empty or binary)"

echo ""
echo "--- Unstage and remove it (it's from main, not this branch's work) ---"
git reset -- html/js/tsm-mission-engine.js
rm -f html/js/tsm-mission-engine.js
rmdir html/js 2>/dev/null || true

echo ""
echo "--- Confirm zero drift from HEAD ---"
git diff --name-status HEAD
echo "(empty above = clean)"

echo ""
echo "--- Re-verify both fixes one final time ---"
echo "Groq precedence occurrences (expect 5):"
grep -c "GROQ_API_KEY || process.env.GROQ_KEY" server.js
echo "Mortgage blocks (expect 1):"
grep -c "column: 'Mortgage'" tests/e2e/enterprise-capability-coverage.spec.js
node --check server.js && echo "server.js syntax OK"

echo ""
echo "--- Final status breakdown ---"
git status --porcelain | awk '{print $1}' | sort | uniq -c
echo ""
echo "--- Remaining untracked (Category 1/2/3 from original triage) count ---"
git status --porcelain | grep '^??' | wc -l
