#!/bin/bash

echo "=========================================="
echo "TSM WAR ROOM STREAM FINAL PATCH"
echo "=========================================="

SERVER="server.js"

echo
echo "[1] Verify POST route"
grep -n "/api/war-room/stream" $SERVER

echo
echo "[2] Add health GET shim"

grep -q "app.get('/api/war-room/stream'" $SERVER

if [ $? -ne 0 ]; then

python3 - <<'PY'
from pathlib import Path

p=Path("server.js")
s=p.read_text()

marker="app.post('/api/war-room/stream'"

insert="""

// Health probe for War Room Stream
// Keeps diagnostics and monitoring from failing.
// AI generation remains POST only.
app.get('/api/war-room/stream', (req,res)=>{
  res.json({
    status:"online",
    route:"/api/war-room/stream",
    methods:["POST"],
    service:"TSM Neural Core"
  });
});

"""

if marker in s:
    s=s.replace(marker,insert+marker)
    p.write_text(s)
    print("GET shim added")
else:
    print("POST route marker not found")

PY

else
echo "GET shim already exists"
fi


echo
echo "[3] Restart server"

pkill -f "node server.js" || true

sleep 2

nohup npm start >/tmp/tsm-server.log 2>&1 &

sleep 5


echo
echo "[4] Test GET"

curl -s http://localhost:8080/api/war-room/stream


echo
echo
echo "[5] Test POST"

curl -s \
-X POST \
-H "Content-Type: application/json" \
-d '{"messages":[{"role":"user","content":"TSM stream health check"}]}' \
http://localhost:8080/api/war-room/stream | head -20


echo
echo "=========================================="
echo "PATCH COMPLETE"
echo "=========================================="
