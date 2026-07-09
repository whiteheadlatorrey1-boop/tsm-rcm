#!/usr/bin/env bash

set -euo pipefail

echo "======================================"
echo " TSM MDM Phase 3 Installer"
echo " Intelligence + Risk + Mission Layer"
echo "======================================"

BACKUP="backup-mdm-phase3-$(date +%Y%m%d-%H%M%S)"

echo "[1/8] Creating backup..."
mkdir -p "$BACKUP"

cp -r server/mdm "$BACKUP/" 2>/dev/null || true
cp -r html/war-rooms/mdm "$BACKUP/" 2>/dev/null || true
cp server.js "$BACKUP/" 2>/dev/null || true

echo "Backup: $BACKUP"


echo "[2/8] Creating MDM risk engine..."

mkdir -p server/mdm

cat > server/mdm/mdm-risk-engine.js <<'JS'
/*
 TSM MDM Risk Engine
 Converts data quality findings into business risk
*/

function calculateRisk(record){

    let score = 0;
    let impacts=[];

    if(record.quality < 50){
        score += 40;
        impacts.push(
            "Critical master data quality failure"
        );
    }

    if(record.status === "DUPLICATE"){
        score += 25;
        impacts.push(
            "Duplicate master exposure"
        );
    }


    (record.issues || []).forEach(issue=>{

        if(issue.toLowerCase().includes("email")){
            score += 10;
            impacts.push(
              "Customer communication risk"
            );
        }

        if(issue.toLowerCase().includes("tax")){
            score += 20;
            impacts.push(
              "Compliance risk"
            );
        }

    });


    let level =
        score >= 70 ? "HIGH" :
        score >= 40 ? "MEDIUM" :
        "LOW";


    return {
        id:record.id,
        risk:level,
        score,
        impacts,
        recommendedAction:
            level==="HIGH"
            ? "Create stewardship mission"
            : "Monitor"
    };

}


module.exports={
    calculateRisk
};
JS


echo "[3/8] Creating mission store..."

mkdir -p data/live-data-store

if [ ! -f data/live-data-store/mdm-missions.json ]; then

cat > data/live-data-store/mdm-missions.json <<'JSON'
[]
JSON

fi


echo "[4/8] Creating MDM API adapter..."

cat > server/mdm/mdm-phase3.js <<'JS'

const fs=require("fs");
const path=require("path");

const riskEngine=require("./mdm-risk-engine");


function buildHealth(summary){

return {
 ok:true,
 score:summary.overallScore,
 status:
 summary.overallScore >=80
 ? "HEALTHY"
 : "ATTENTION"
};

}



function buildAnomalies(detail){

return detail.records
.filter(
r=>r.quality < 80 ||
r.status==="DUPLICATE"
)
.map(r=>{

return {
...riskEngine.calculateRisk(r),
record:r
};

});

}



function buildMissions(anomalies){

return anomalies.map((a,i)=>({

id:
"MDM-"+Date.now()+"-"+i,

source_node:"mdm",

objective:
a.recommendedAction,

context:{
record:a.id
},

risk_score:a.score,

owner:
"Data Steward",

status:"OPEN",

completion_pct:0,

progression_steps:[

"Review anomaly",

"Approve remediation",

"Execute correction"

]

}));

}


module.exports={
buildHealth,
buildAnomalies,
buildMissions
};

JS


echo "[5/8] Updating live bridge..."

cat >> js/mdm-live-data.js <<'JS'


window.TSM_MDM_PHASE3=true;

JS


echo "[6/8] Creating MDM Strategist..."

mkdir -p html/war-rooms/mdm


cat > html/war-rooms/mdm/mdm-strategist.html <<'HTML'
<!DOCTYPE html>
<html>

<head>
<title>TSM MDM Strategist</title>
<link rel="stylesheet" href="/shared/tsm-mdm.css">
</head>

<body>

<div class="mdm-shell">

<h1>
MDM Intelligence Strategist
</h1>


<div id="strategy">
Loading intelligence...
</div>


</div>


<script src="/js/mdm-live-data.js"></script>

<script>

TSM_MDM_LIVE.hydrate()
.then(state=>{

document.getElementById("strategy")
.innerHTML=`

<h2>
Enterprise Trust:
${state.health.score || "--"}%
</h2>

<p>
MDM AI recommends reviewing
${state.anomalies?.length || 0}
risk items.
</p>

`;

});


</script>

</body>
</html>
HTML


echo "[7/8] Validation..."

node --check server.js
node --check server/mdm/mdm-risk-engine.js
node --check server/mdm/mdm-phase3.js


echo "[8/8] Complete"

echo "
======================================
 MDM PHASE 3 INSTALLED
======================================

Next:

git add .
git commit -m \"feat: add MDM phase 3 intelligence risk and mission layer\"

git tag mdm-phase3-complete
"

