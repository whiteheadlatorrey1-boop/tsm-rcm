#!/bin/bash
set -e

echo "== 1. Verify new hub file is present =="
if [ ! -f "html/tsm-platform-hub.html" ]; then
  echo "ERROR: html/tsm-platform-hub.html not found."
  echo "Download hub-index-NEW.html from the chat and save it to html/tsm-platform-hub.html first."
  exit 1
fi
echo "Found html/tsm-platform-hub.html"

echo ""
echo "== 2. Locate current app.get('/') handler in server.js =="
if ! grep -n "^app.get('/', (_req, res) => {" server.js > /dev/null; then
  echo "ERROR: could not find the exact app.get('/') handler signature. Aborting — no changes made."
  echo "Paste server.js lines 1365-1380 back to Claude to get an updated script."
  exit 1
fi

echo ""
echo "== 3. Backup server.js =="
cp server.js server.js.bak-hub-route
echo "Backup saved: server.js.bak-hub-route"

echo ""
echo "== 4. Apply the route swap =="
python3 - <<'PYEOF'
import sys

FILE = "server.js"

OLD = """app.get('/', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.sendFile(path.join(dirPath, 'bpo', 'bpo-command-center.html'), (err) => {
    if (err) res.sendFile(path.join(dirPath, 'healthcare', 'hc-strategist', 'index.html'));
  });
});"""

NEW = """app.get('/', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.sendFile(path.join(dirPath, 'tsm-platform-hub.html'), (err) => {
    if (err) res.sendFile(path.join(dirPath, 'war-rooms', 'bpo', 'bpo-command-center.html'));
  });
});"""

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

if OLD not in content:
    print("ERROR: anchor block not found verbatim. No changes made.")
    sys.exit(1)

if content.count(OLD) != 1:
    print(f"ERROR: anchor block found {content.count(OLD)} times, expected 1. No changes made.")
    sys.exit(1)

content = content.replace(OLD, NEW)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("Route updated: '/' now serves tsm-platform-hub.html (fallback: war-rooms/bpo/bpo-command-center.html)")
PYEOF

echo ""
echo "== 5. Syntax check =="
node -c server.js && echo "server.js syntax OK"

echo ""
echo "== 6. IMPORTANT: express.static is still mounted before this route =="
echo "Since html/index.html exists, express.static at line 177 will keep intercepting"
echo "GET / before this handler ever runs. This script does NOT touch that — say the"
echo "word and I'll handle it separately, since it needs a decision on whether"
echo "html/index.html (the BPO/tax product shell) should move or be excluded from static serving."
echo ""
echo "Next: restart your server, then verify:"
echo "  curl -s http://localhost:8080/ | grep -o '<title>.*</title>'"
echo "Expect: <title>TSM-Consultz — Platform Hub</title>"
echo "If you still see <title>TSM Shell</title>, that confirms the static-mount issue above."