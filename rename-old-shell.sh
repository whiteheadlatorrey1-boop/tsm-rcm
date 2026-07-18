#!/bin/bash
set -e

OLD_NAME="html/index.html"
NEW_NAME="html/tsm-shell-bpo-tax-portal.html"

echo "== 1. Verify old file exists, new name is free =="
if [ ! -f "$OLD_NAME" ]; then
  echo "ERROR: $OLD_NAME not found. Nothing to rename."
  exit 1
fi
if [ -f "$NEW_NAME" ]; then
  echo "ERROR: $NEW_NAME already exists. Aborting to avoid overwrite."
  exit 1
fi

echo "== 2. git mv (preserves history) =="
git mv "$OLD_NAME" "$NEW_NAME"
echo "Renamed: $OLD_NAME -> $NEW_NAME"

echo ""
echo "== 3. Restart server and verify =="
fuser -k 8080/tcp 2>/dev/null || true
sleep 1
nohup node server.js > server.log 2>&1 &
sleep 2

echo ""
echo "== Root '/' title (expect: TSM-Consultz — Platform Hub) =="
curl -s http://localhost:8080/ | grep -o '<title>.*</title>'

echo ""
echo "== Old shell still reachable at its new path =="
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8080/html/tsm-shell-bpo-tax-portal.html"

echo ""
echo "If root title shows 'TSM-Consultz — Platform Hub' and the second line shows 200,"
echo "commit with:"
echo "  git add -A && git commit -m 'fix: rename html/index.html to free up static-mount conflict at root, let new platform hub serve at /'"
echo "  git push"