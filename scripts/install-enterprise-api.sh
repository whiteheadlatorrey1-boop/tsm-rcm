#!/usr/bin/env bash
set -e

echo "🚀 Installing TSM Enterprise Intelligence API mount..."

SERVER="server.js"

if [ ! -f "$SERVER" ]; then
  echo "❌ server.js not found"
  exit 1
fi


cp "$SERVER" "$SERVER.backup.$(date +%Y%m%d-%H%M%S)"

echo "✅ Backup created"


if grep -q "enterprise/api/enterprise-router" "$SERVER"; then
    echo "✅ Enterprise router already mounted"
else

node <<'NODE'
const fs=require("fs");

const file="server.js";

let src=fs.readFileSync(file,"utf8");

const marker =
"app.use(require('express').urlencoded({ extended: false }));";

if(!src.includes(marker)){
    console.error("❌ JSON middleware marker not found");
    process.exit(1);
}

const inject = `

// ── ENTERPRISE INTELLIGENCE API ───────────────────────────────
const enterpriseRouter =
    require("./server/enterprise/api/enterprise-router");

app.use(
    "/api/enterprise",
    enterpriseRouter
);

`;

src =
src.replace(
    marker,
    marker + inject
);

fs.writeFileSync(file,src);

console.log("✅ Enterprise router mounted");

NODE

fi


echo "🔍 Checking mount..."

grep -n "enterpriseRouter" server.js || true


echo "🛑 Restarting server..."

pkill -f "node server.js" || true

sleep 2


echo "🚀 Starting server..."

nohup node server.js > enterprise-server.log 2>&1 &


sleep 5


echo "🧪 Testing Enterprise Dashboard..."

curl -s -X POST \
http://localhost:8080/api/enterprise/dashboard \
-H "Content-Type: application/json" \
-d '{"vertical":"healthcare","entity":"Banner Health"}' | jq .


echo ""
echo "✅ Enterprise Intelligence API installation complete"
