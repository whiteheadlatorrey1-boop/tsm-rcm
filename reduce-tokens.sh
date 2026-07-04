#!/usr/bin/env bash
set -e

python3 << 'PYEOF'
import re

files = [
    "html/plant-incident.html",
    "html/cyber-incident.html",
    "html/supplier-shutdown.html",
]

for path in files:
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print(f"SKIP: {path} not found")
        continue

    changed = False

    # Lower client-side max_tokens request from 800 to 400
    if "max_tokens: 400" in content:
        print(f"SKIP: {path} already at max_tokens: 400")
    elif "max_tokens: 800" in content:
        content = content.replace("max_tokens: 800", "max_tokens: 400")
        changed = True
        print(f"OK: {path} max_tokens 800 -> 400")
    else:
        # try to find whatever value is there for visibility
        m = re.search(r"max_tokens:\s*(\d+)", content)
        if m:
            print(f"WARN: {path} has max_tokens: {m.group(1)} (not 800) — left unchanged, review manually")
        else:
            print(f"WARN: {path} no max_tokens found in client call")

    if changed:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)

# Server-side default fallback
server_path = "server.js"
with open(server_path, "r", encoding="utf-8") as f:
    content = f.read()

if "max_tokens || 400" in content:
    print("SKIP: server.js default already 400")
elif "max_tokens || 600" in content:
    content = content.replace("max_tokens || 600", "max_tokens || 400")
    with open(server_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK: server.js default max_tokens 600 -> 400")
else:
    m = re.search(r"max_tokens\s*\|\|\s*(\d+)", content)
    if m:
        print(f"WARN: server.js default max_tokens is {m.group(1)} (not 600) — left unchanged")
    else:
        print("WARN: server.js default max_tokens fallback not found")
PYEOF

echo ""
echo "=== Verifying syntax ==="
node -c server.js && echo "server.js OK"
for f in html/plant-incident.html html/cyber-incident.html html/supplier-shutdown.html; do
  if [ -f "$f" ]; then
    node -e "
const fs = require('fs');
const html = fs.readFileSync('$f', 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (m) { try { new Function(m[1]); console.log('$f JS OK'); } catch(e) { console.log('$f SYNTAX ERROR:', e.message); } }
"
  fi
done

echo ""
echo "=== Current max_tokens values ==="
grep -n "max_tokens" html/plant-incident.html html/cyber-incident.html html/supplier-shutdown.html server.js
