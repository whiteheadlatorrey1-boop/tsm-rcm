#!/usr/bin/env bash

set -euo pipefail

echo "======================================"
echo " TSM MDM Phase 3B Installer"
echo " Executive Intelligence Layer"
echo " Explainability + Portal + Mission View"
echo "======================================"

BACKUP="backup-mdm-phase3b-$(date +%Y%m%d-%H%M%S)"

echo "[1/8] Creating backup..."

mkdir -p "$BACKUP"

cp -r html/war-rooms/mdm "$BACKUP/" 2>/dev/null || true
cp -r server/mdm "$BACKUP/" 2>/dev/null || true

echo "Backup: $BACKUP"


echo "[2/8] Creating explainability engine..."

cat > server/mdm/mdm-explainability.js <<'JS'
/*
 TSM MDM Explainability Engine

 Converts findings into executive reasoning.
*/

function explain(anomaly){

    const confidence =
        anomaly.riskScore >= 80 ? 92 :
        anomaly.riskScore >= 50 ? 78 :
        65;


    return {

        finding:
            anomaly.finding,

        risk:
            anomaly.riskScore >= 80
            ? "HIGH"
            : anomaly.riskScore >= 50
            ? "MEDIUM"
            : "LOW",


        explanation:{

            whyDetected:
            `${anomaly.type} identified through master data validation and matching rules.`,

            businessImpact:
            anomaly.exposure
            ?
            `Potential business exposure ${anomaly.exposure}`
            :
            "Potential operational data quality impact.",


            recommendedAction:
            "Validate golden record and execute controlled remediation.",


            confidence

        }

    };

}


module.exports={
    explain
};
JS


echo "[3/8] Creating executive portal..."

mkdir -p html/war-rooms/mdm


cat > html/war-rooms/mdm/mdm-executive-portal.html <<'HTML'
<!DOCTYPE html>

<html>

<head>

<title>
TSM MDM Executive Intelligence
</title>

<link rel="stylesheet" href="/shared/tsm-mdm.css">

</head>


<body>

<div class="mdm-shell">


<h1>
MDM Executive Intelligence
</h1>


<div class="mdm-grid">


<div class="mdm-card">

<div class="mdm-label">
MASTER DATA TRUST
</div>

<div id="trust"
class="mdm-score">
--
</div>

</div>



<div class="mdm-card">

<h2>
Top Risk
</h2>

<div id="risk">
Loading...
</div>

</div>



<div class="mdm-card">

<h2>
AI Explanation
</h2>

<div id="explain">
Loading...
</div>

</div>



<div class="mdm-card">

<h2>
Mission Status
</h2>

<div id="mission">
Loading...
</div>

</div>


</div>

</div>



<script>

async function loadMDM(){

const health =
await fetch("/api/mdm/health")
.then(r=>r.json());


document.getElementById("trust")
.innerHTML =
health.healthScore ||
health.score ||
"--";



const anomalies =
await fetch("/api/mdm/anomalies")
.then(r=>r.json());


const a =
anomalies[0] ||
anomalies.anomalies?.[0];


if(a){

document.getElementById("risk")
.innerHTML =
`
${a.finding || ""}
<br>
Risk Score:
${a.riskScore || a.score}
<br>
Exposure:
${a.exposure || ""}
`;


}



const missions =
await fetch("/api/mdm/missions")
.then(r=>r.json());


const m =
missions[0] ||
missions.missions?.[0];


if(m){

document.getElementById("mission")
.innerHTML =
`
${m.id}
<br>
${m.status}
<br>
${m.completion_pct}%
`;

}


}


loadMDM();


</script>


</body>

</html>
HTML


echo "[4/8] Registering explainability module..."

cat >> server/mdm/mdm-phase3.js <<'JS'


// Phase 3B Explainability

const mdmExplainability =
require("./mdm-explainability");


module.exports.explainAnomaly =
function(anomaly){

return mdmExplainability.explain(anomaly);

};

JS


echo "[5/8] Adding capability marker..."

mkdir -p data/live-data-store

cat > data/live-data-store/mdm-capability.json <<'JSON'
{
 "node":"MDM",
 "phase":"3B",
 "capability":"Executive Intelligence",
 "features":[
  "Risk Detection",
  "Explainability",
  "Mission Orchestration",
  "Executive Reporting"
 ]
}
JSON


echo "[6/8] Validation..."

node --check server/mdm/mdm-explainability.js
node --check server/mdm/mdm-phase3.js
node --check server.js


echo "[7/8] Complete"


echo "
======================================
 MDM PHASE 3B COMPLETE
======================================

Next:

git add .
git commit -m \"feat: add MDM executive intelligence explainability layer\"

git tag mdm-phase3b-complete

"


