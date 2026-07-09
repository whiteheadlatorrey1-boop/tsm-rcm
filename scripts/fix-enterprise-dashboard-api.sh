#!/usr/bin/env bash
set -e

echo "🔎 Checking enterprise router..."

ROUTER="server/enterprise/api/enterprise-router.js"

if [ ! -f "$ROUTER" ]; then
    echo "❌ Missing $ROUTER"
    exit 1
fi


cp "$ROUTER" "$ROUTER.backup.$(date +%Y%m%d-%H%M%S)"


node <<'NODE'

const fs=require("fs");

const file="server/enterprise/api/enterprise-router.js";

let src=fs.readFileSync(file,"utf8");


if(!src.includes('"/dashboard"')){

src += `


// ── Enterprise Dashboard APIs ───────────────────────────────

const engine =
require("../enterprise-engine");


function payload(req){

return Object.assign({

vertical:"healthcare",

entity:"Banner Health",

customer:{
 id:"BAN-001"
},

audit:{
 id:"AUDIT-2026-001"
}

},req.body || {});

}



router.post("/dashboard", async(req,res)=>{

const result =
await engine.enrich(payload(req));


res.json({

ok:true,

dashboard:{

entity:result.entity,

vertical:result.vertical,

healthScore:
result.summary.highestScore,

capabilities:
result.capabilities

}

});

});



router.post("/decision", async(req,res)=>{

const result =
await engine.enrich(payload(req));


res.json({

ok:true,

decision:
result.decision,

explainability:
result.explainability

});

});



router.post("/missions", async(req,res)=>{

const result =
await engine.enrich(payload(req));


res.json({

ok:true,

count:
result.capabilities.length,

missions:
result.capabilities
.filter(c=>c.score < 90)
.map(c=>({

id:
"MISSION-"+c.id.toUpperCase(),

capability:
c.title,

score:
c.score,

confidence:
c.confidence,

recommendations:
c.recommendations

}))

});

});

`;

fs.writeFileSync(file,src);

console.log("✅ Dashboard routes added");

}

else {

console.log("✅ Dashboard routes already exist");

}

NODE


echo "🔄 Restarting..."

pkill -f "node server.js" || true

sleep 2

nohup node server.js > enterprise.log 2>&1 &

sleep 5


echo "🧪 Testing..."

curl -s -X POST \
http://localhost:8080/api/enterprise/dashboard \
-H "Content-Type: application/json" \
-d '{"vertical":"healthcare","entity":"Banner Health"}' | jq .


echo "✅ Enterprise dashboard API ready"

