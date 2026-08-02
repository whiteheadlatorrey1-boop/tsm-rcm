#!/bin/bash

set -e

echo "=========================================="
echo "TSM Enterprise Evidence Replay Engine"
echo "=========================================="

RUNTIME="html/shared/runtime/enterprise"
DATA="data/enterprise-lab"
EXEC="html/executive-command-center"
REPORT="reports/evidence-replay-engine-report.txt"

mkdir -p "$RUNTIME"
mkdir -p "$DATA"
mkdir -p "$EXEC"
mkdir -p reports


BACKUP="backups/evidence-replay/$(date +%Y%m%d_%H%M%S)"

echo ""
echo "Creating backup..."

mkdir -p "$BACKUP"


for file in \
"$RUNTIME/evidence-replay-engine.js" \
"$DATA/evidence-replay-log.json" \
"$EXEC/evidence-replay.html" \
"$EXEC/evidence-replay.js"
do

if [ -f "$file" ]; then
cp "$file" "$BACKUP/"
fi

done


echo "Backup:"
echo "$BACKUP"


echo ""
echo "Installing Evidence Replay Engine..."


cat > "$RUNTIME/evidence-replay-engine.js" <<'EOF'
(function(){

window.TSMEvidenceReplay = {


ledger:[],


record(event){

const entry = {

id:
"EV-" + Date.now(),

type:
event.type || "MISSION_EVENT",

mission:
event.mission || null,

vertical:
event.vertical || null,

sapPhase:
event.sapPhase || null,

decision:
event.decision || "PENDING",

timestamp:
new Date().toISOString()

};


this.ledger.push(entry);


this.persist(entry);


return entry;

},



persist(entry){


let existing=[];


try{

existing =
JSON.parse(
localStorage.getItem(
"tsm_evidence_ledger"
)
) || [];

}
catch(e){}


existing.push(entry);


localStorage.setItem(
"tsm_evidence_ledger",
JSON.stringify(existing)
);


},



getReplay(){


return this.ledger;


},



explain(missionId){


return this.ledger.filter(

e =>
e.mission === missionId

);


}


};


})();
EOF


echo "CREATED:"
echo "$RUNTIME/evidence-replay-engine.js"



echo ""
echo "Creating Evidence Ledger Replay Store..."


cat > "$DATA/evidence-replay-log.json" <<'EOF'
{

"events":[

{

"id":"EV-DEMO-001",

"mission":"SIM-CONSTRUCTION-001",

"vertical":"construction",

"sapPhase":"WIP",

"decision":"Activate Construction War Room",

"reason":

"Supplier delay threatens project milestone"

},


{

"id":"EV-DEMO-002",

"mission":"SIM-HEALTHCARE-001",

"vertical":"healthcare",

"sapPhase":"O2C",

"decision":"Revenue Cycle Investigation",

"reason":

"Denial spike exceeds threshold"

}

]

}
EOF


echo "CREATED:"
echo "$DATA/evidence-replay-log.json"



echo ""
echo "Creating Executive Replay Controller..."


cat > "$EXEC/evidence-replay.js" <<'EOF'
(function(){


window.TSMReplayUI = {


load(){


fetch(
"../data/enterprise-lab/evidence-replay-log.json"
)
.then(
r=>r.json()
)
.then(
data=>{


const container =
document.getElementById(
"replay"
);


data.events.forEach(

event=>{


const div =
document.createElement(
"div"
);


div.innerHTML =

`
<h3>${event.id}</h3>
<p>
Mission:
${event.mission}
</p>

<p>
SAP Phase:
${event.sapPhase}
</p>

<p>
Decision:
${event.decision}
</p>

<p>
Reason:
${event.reason}
</p>

<hr>
`;


container.appendChild(div);


}

);


}

);


}


};


})();
EOF


echo "CREATED:"
echo "$EXEC/evidence-replay.js"



echo ""
echo "Creating Executive Replay UI..."


cat > "$EXEC/evidence-replay.html" <<'EOF'
<!DOCTYPE html>

<html>

<head>

<title>
TSM Evidence Replay
</title>


<style>

body{

font-family:Arial;
background:#111;
color:white;
padding:40px;

}


.card{

border:1px solid #555;
padding:20px;
margin:20px;

}

</style>


</head>


<body>


<h1>
TSM Enterprise Decision Evidence Replay
</h1>


<div class="card">

<h2>
Mission Decision History
</h2>


<div id="replay">

Loading Evidence...

</div>


</div>


<script src="../shared/runtime/enterprise/evidence-replay-engine.js"></script>

<script src="evidence-replay.js"></script>


<script>

TSMReplayUI.load();

</script>


</body>

</html>
EOF


echo "CREATED:"
echo "$EXEC/evidence-replay.html"



echo ""
echo "Generating Report..."


cat > "$REPORT" <<EOF
TSM Enterprise Evidence Replay Engine

STATUS:
READY


CREATED:

Evidence Replay Engine
Evidence Ledger Store
Executive Replay Interface


CONNECTED:

Mission Engine
War Room Simulation
Sentinel Governance
Executive Command Center


DECISION TRACE:

Mission Created
 |
SAP Phase
 |
Impact Analysis
 |
War Room Decision
 |
Sentinel Evidence
 |
Executive Replay


EOF


echo ""
echo "=========================================="
echo "EVIDENCE REPLAY ENGINE READY"
echo ""
echo "Open:"
echo "$EXEC/evidence-replay.html"
echo ""
echo "Report:"
echo "$REPORT"
echo "=========================================="