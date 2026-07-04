#!/usr/bin/env bash
set -e

FILE="server.js"

if [ ! -f "$FILE" ]; then
  echo "ERROR: $FILE not found. Run this from repo root."
  exit 1
fi

python3 << 'PYEOF'
import re

path = "server.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changed = False

# Match both occurrences of the swallowed-error pattern and add logging before each.
# Handles both spacing variants seen so far: "message|| " and "message || "
pattern = re.compile(
    r"(const err = await groqRes\.json\(\)\.catch\(\(\) => \(\{\}\)\);\n)"
    r"(\s*)(return res\.status\(502\)\.json\(\{ error: err\.error\?\.message\s*\|\|\s*'Groq error' \}\);)"
)

def add_log(m):
    prefix, indent, return_line = m.group(1), m.group(2), m.group(3)
    if "console.error('Groq error on" in content:
        return m.group(0)  # shouldn't hit if we already checked, safety no-op
    log_line = f"{indent}console.error('Groq error response:', JSON.stringify(err));\n"
    return prefix + log_line + indent + return_line

matches = list(pattern.finditer(content))
n_matches = len(matches)

if 'console.error(\'Groq error response:\'' in content:
    print("SKIP: logging already present")
elif n_matches == 0:
    print("WARN: no matches found — pattern may have drifted, check manually")
else:
    content = pattern.sub(add_log, content)
    changed = True
    print(f"OK: added error logging to {n_matches} occurrence(s)")

if changed:
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("File written.")
else:
    print("No changes written.")
PYEOF

echo ""
echo "=== Verifying syntax ==="
node -c server.js && echo "server.js syntax OK"

echo ""
echo "=== Confirming ==="
grep -n "console.error('Groq error response:'" server.js

echo ""
echo "=== Checking frontend message pattern (plant-incident.html) ==="
grep -n "messages:" html/plant-incident.html | head -20
