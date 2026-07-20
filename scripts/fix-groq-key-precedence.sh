#!/bin/bash
set -e

echo "=========================================="
echo "TSM Groq Key Precedence Fix"
echo "=========================================="

FILE="server.js"
BACKUP="backups/groq-key-fix/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP"

echo "Backing up:"
cp "$FILE" "$BACKUP/"

python3 <<'PY'

import re
from pathlib import Path

file = Path("server.js")
text = file.read_text()

# Matches: process.env.GROQ_KEY || process.env.GROQ_API_KEY
# regardless of whitespace/newlines between the two operands.
pattern = re.compile(
    r"process\.env\.GROQ_KEY\s*\|\|\s*process\.env\.GROQ_API_KEY"
)

matches = pattern.findall(text)
count = len(matches)
print(f"Bad-precedence occurrences found: {count}")

EXPECTED = 4
if count == 0:
    raise SystemExit(
        "ABORT: no 'GROQ_KEY || GROQ_API_KEY' pattern found. "
        "Either already fixed, or the variable names differ from what's expected. "
        "No changes written."
    )
if count != EXPECTED:
    print(
        f"WARNING: expected {EXPECTED} occurrences (server.js:54,96,347,450) "
        f"but found {count}. Proceeding anyway since >0 found — "
        "review the verification grep output below carefully."
    )

new_text = pattern.sub(
    "process.env.GROQ_API_KEY || process.env.GROQ_KEY",
    text,
)

assert new_text != text, "ABORT: substitution produced no change."
assert pattern.search(new_text) is None, (
    "ABORT: bad pattern still present after substitution — refusing to write."
)

file.write_text(new_text)
print(f"Applied fix to {count} occurrence(s).")

PY

echo ""
echo "Verifying (all matches should now read GROQ_API_KEY || GROQ_KEY)..."
grep -n "GROQ_API_KEY || process.env.GROQ_KEY\|GROQ_KEY || process.env.GROQ_API_KEY" "$FILE" || true

echo ""
echo "Checking for any remaining bad-precedence occurrences (should be empty)..."
if grep -n "process\.env\.GROQ_KEY *|| *process\.env\.GROQ_API_KEY" "$FILE"; then
    echo "ERROR: bad pattern still present — fix incomplete."
    exit 1
else
    echo "Clean — no bad-precedence pattern remains."
fi

echo ""
echo "Running node --check..."
node --check "$FILE"
echo "Syntax OK."

echo ""
echo "=========================================="
echo "FIX COMPLETE"
echo "Backup: $BACKUP"
echo "Next: pkill -f \"node server.js\"; lsof -i :8080 (should be empty); node server.js"
echo "Then retest the /api/war-room/stream curl and commit separately from the capability-matrix fix."
echo "=========================================="