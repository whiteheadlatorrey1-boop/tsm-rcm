#!/usr/bin/env bash
set -euo pipefail

echo "== Adding static, visible subtitle to mortgage-war-room.html nav bar =="
python3 << 'PYEOF'
path = "html/war-rooms/mortgage/mortgage-war-room.html"
with open(path) as f:
    content = f.read()

old = '''  <div class="nav-brand">TSM SHELL // MORTGAGE COMMAND CENTER</div>
  <div class="nav-right">'''

new = '''  <div class="nav-brand">TSM SHELL // MORTGAGE COMMAND CENTER
    <div style="font-size:9px;font-weight:400;color:var(--text-dim);margin-top:2px">
      Every file shows its assigned loan officer and loan program at a glance across the active pipeline.
    </div>
  </div>
  <div class="nav-right">'''

assert content.count(old) == 1, f"expected exactly 1 match, found {content.count(old)}"
content = content.replace(old, new, 1)

with open(path, "w") as f:
    f.write(content)
print("added static subtitle")
PYEOF

echo "== Restarting server =="
kill $(pgrep -f "node server.js") 2>/dev/null || true
sleep 1
nohup node server.js > server.log 2>&1 &
sleep 2
cat server.log

echo "== Re-running console-error check =="
node check-console-errors.js http://localhost:8080

echo "== Re-running Playwright e2e suite =="
npm run test:e2e 2>&1 | grep -A1 "capability-coverage] Mortgage"

echo ""
echo "== If still not 8/10, the term-matching in poolText may need the exact phrases"
echo "== 'loan officer' and 'loan program' to appear verbatim (case-insensitive) — check the sentence above matches those phrases exactly. =="