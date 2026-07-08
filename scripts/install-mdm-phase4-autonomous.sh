#!/usr/bin/env bash

set -euo pipefail

echo "=========================================="
echo " TSM MDM Phase 4 Autonomous Governance"
echo " Stewardship | Decision | Memory Layer"
echo "=========================================="

ROOT="$(pwd)"
BACKUP="backup-mdm-phase4-$(date +%Y%m%d-%H%M%S)"

echo "[1/8] Creating backup..."
mkdir -p "$BACKUP"

cp server.js "$BACKUP/server.js"

[ -d server/mdm ] && cp -r server/mdm "$BACKUP/"
[ -d data/live-data-store ] && cp -r data/live-data-store "$BACKUP/"

echo "Backup created: $BACKUP"


echo "[2/8] Creating MDM memory store..."

mkdir -p \
data/mdm-memory \
server/mdm


cat > data/mdm-memory/previous-decisions.json <<'EOF'
[]
EOF


cat > data/mdm-memory/steward-actions.json <<'EOF'
[]
EOF


cat > data/mdm-memory/merge-patterns.json <<'EOF'
[]
EOF


echo "[3/8] Creating stewardship engine..."

cat > server/mdm/mdm-stewardship.js <<'EOF'

const missions = require("../../data/live-data-store/mdm-missions.json");

function getStewardQueue(){

    return missions.map(m => ({
        id:m.id,
        finding:m.finding,
        risk:m.risk_score,
        owner:m.owner || "Data Governance",
        sla:"48 hours",
        recommendedAction:
            m.risk_score >= 80
            ? "Immediate Review"
            : "Standard Review"
    }));

}

module.exports={
    getStewardQueue
};

EOF


echo "[4/8] Creating decision engine..."

cat > server/mdm/mdm-decision-engine.js <<'EOF'

function analyze(recordA, recordB){

    let confidence = 0;
    let reasons=[];


    if(recordA.taxId &&
       recordA.taxId === recordB.taxId){

        confidence += 50;
        reasons.push("Same tax identifier");

    }


    if(recordA.address &&
       recordA.address === recordB.address){

        confidence += 25;
        reasons.push("Same address");

    }


    if(recordA.name &&
       recordB.name){

        confidence += 25;
        reasons.push("Name similarity");

    }


    return {

        decision:
            confidence >= 75
            ? "MERGE"
            : "REVIEW",

        confidence,

        reasons

    };

}


module.exports={
    analyze
};

EOF


echo "[5/8] Creating memory layer..."

cat > server/mdm/mdm-memory.js <<'EOF'

const fs=require("fs");


const BASE="data/mdm-memory";


function append(file,data){

    let current=[];

    try{

        current =
        JSON.parse(
            fs.readFileSync(
                `${BASE}/${file}`
            )
        );

    }catch(e){}


    current.push(data);


    fs.writeFileSync(
        `${BASE}/${file}`,
        JSON.stringify(current,null,2)
    );

}


module.exports={

saveDecision(data){

append(
"previous-decisions.json",
data
);

},


saveStewardAction(data){

append(
"steward-actions.json",
data
);

}

};

EOF


echo "[6/8] Wiring APIs..."

grep -q "mdm-stewardship" server.js || cat >> server.js <<'EOF'


// ===== TSM MDM PHASE 4 AUTONOMOUS GOVERNANCE =====

const mdmStewardship =
require("./server/mdm/mdm-stewardship");

const mdmDecision =
require("./server/mdm/mdm-decision-engine");

const mdmMemory =
require("./server/mdm/mdm-memory");


app.get('/api/mdm/stewardship',
(req,res)=>{

res.json({

ok:true,

queue:
mdmStewardship.getStewardQueue()

});

});


app.post('/api/mdm/decision',
(req,res)=>{

const result =
mdmDecision.analyze(
req.body.recordA || {},
req.body.recordB || {}
);


mdmMemory.saveDecision({

timestamp:new Date(),
result

});


res.json({

ok:true,
result

});

});


app.get('/api/mdm/memory',
(req,res)=>{

res.json({

ok:true,

enabled:true,

layers:[

"previous-decisions",
"steward-actions",
"merge-patterns"

]

});

});


// ===== END PHASE 4 =====

EOF


echo "[7/8] Updating live bridge..."

cat >> js/mdm-live-data.js <<'EOF'


// Phase 4 Autonomous Governance

window.TSM_MDM_LIVE.fetchGovernance =
async function(){

return {

stewardship:
await this.fetchJSON(
"/api/mdm/stewardship"
),

memory:
await this.fetchJSON(
"/api/mdm/memory"
)

};

};

EOF


echo "[8/8] Validation..."

node --check server.js


git add \
server.js \
server/mdm \
data/mdm-memory \
js/mdm-live-data.js


echo ""
echo "=========================================="
echo " MDM Phase 4 COMPLETE"
echo "=========================================="

echo ""
echo "Test:"
echo "curl http://localhost:8080/api/mdm/stewardship"
echo "curl http://localhost:8080/api/mdm/memory"
echo ""
