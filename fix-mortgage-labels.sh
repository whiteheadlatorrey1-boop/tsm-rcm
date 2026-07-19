#!/usr/bin/env bash
set -euo pipefail

echo "== Relabeling real column headers in mortgage-war-room.html =="
python3 << 'PYEOF'
path = "html/war-rooms/mortgage/mortgage-war-room.html"
with open(path) as f:
    content = f.read()

old = "cols = ['LOAN ID', 'BORROWER', 'PROGRAM', 'AMOUNT', 'STAGE', 'OWNER', 'SLA'];"
new = "cols = ['LOAN ID', 'BORROWER', 'LOAN PROGRAM', 'AMOUNT', 'STAGE', 'LOAN OFFICER', 'SLA'];"

assert content.count(old) == 1, f"expected exactly 1 match, found {content.count(old)} — file may have changed"
content = content.replace(old, new, 1)

with open(path, "w") as f:
    f.write(content)
print("relabeled: PROGRAM -> LOAN PROGRAM, OWNER -> LOAN OFFICER")
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
npm run test:e2e

echo ""
echo "== Expect Mortgage coverage to move from 6/10 to 8/10 (CRM + Product Catalog fixed) =="
echo "== CPQ (rate lock) and Digital Twin (forecast) remain genuine feature gaps — not addressed here. =="