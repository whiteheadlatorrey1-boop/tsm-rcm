#!/bin/bash
set -e

echo "=========================================="
echo "TSM Pending Changes Triage"
echo "=========================================="
echo ""

TOTAL=$(git status --porcelain | wc -l)
echo "Total pending changes: $TOTAL"
echo ""

echo "--- Category 1: untracked apply-*.sh / apply_*.py scripts (low risk) ---"
echo "These don't run automatically and aren't imported by the app — safe to"
echo "bulk-commit as a historical record of applied patches."
git status --porcelain | grep '^??' | awk '{print $2}' | grep -E '^scripts/(apply|fix)[-_].*\.(sh|py)$' | tee /tmp/triage-scripts.txt
SCRIPT_COUNT=$(wc -l < /tmp/triage-scripts.txt)
echo "Count: $SCRIPT_COUNT"
echo ""

echo "--- Category 2: modified TRACKED source files (needs individual review) ---"
echo "These change real runtime behavior — review each with 'git diff <file>'"
echo "before committing, since some may be half-finished or superseded."
git status --porcelain | grep -E '^ ?M' | awk '{print $2}' | tee /tmp/triage-modified.txt
MOD_COUNT=$(wc -l < /tmp/triage-modified.txt)
echo "Count: $MOD_COUNT"
echo ""

echo "--- Category 3: other untracked files (new HTML/JS/data — needs review) ---"
git status --porcelain | grep '^??' | awk '{print $2}' | grep -vE '^scripts/(apply|fix)[-_].*\.(sh|py)$' | tee /tmp/triage-other.txt
OTHER_COUNT=$(wc -l < /tmp/triage-other.txt)
echo "Count: $OTHER_COUNT"
echo ""

echo "--- Category 4: deleted tracked files (needs review — intentional or accidental?) ---"
git status --porcelain | grep -E '^ ?D' | awk '{print $2}' | tee /tmp/triage-deleted.txt
DEL_COUNT=$(wc -l < /tmp/triage-deleted.txt)
echo "Count: $DEL_COUNT"
echo ""

echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo "Scripts (bulk-safe):     $SCRIPT_COUNT"
echo "Modified source (review): $MOD_COUNT"
echo "New untracked (review):   $OTHER_COUNT"
echo "Deleted (review):          $DEL_COUNT"
echo "Total:                     $TOTAL"
echo ""
echo "Lists saved to /tmp/triage-*.txt for reference."
echo ""
echo "Next steps:"
echo "  1. To commit just the scripts (Category 1):"
echo "     git add \$(cat /tmp/triage-scripts.txt)"
echo "     git commit -m 'chore: archive apply-scripts from recent fix sessions'"
echo ""
echo "  2. For Category 2 (modified source), review one at a time:"
echo "     git diff \$(head -1 /tmp/triage-modified.txt)"
echo ""
echo "  3. For Category 3/4, inspect the lists before deciding."
echo "=========================================="