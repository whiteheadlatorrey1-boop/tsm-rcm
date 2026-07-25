#!/bin/bash

set -e

echo "=========================================="
echo "TSM Enterprise Mission Timeline Console"
echo "=========================================="

RUNTIME="html/shared/runtime/enterprise"
EXEC="html/executive-command-center"
DATA="data/enterprise-lab"
REPORT="reports/mission-timeline-console-report.txt"

BACKUP="backups/mission-timeline-console/$(date +%Y%m%d_%H%M%S)"

mkdir -p "$RUNTIME"
mkdir -p "$EXEC"
mkdir -p "$DATA"
mkdir -p "$BACKUP"
mkdir -p reports


echo ""
echo "Creating backup..."

for file in \
"$RUNTIME/mission-timeline-engine.js" \
"$EXEC/mission-timeline.html" \
"$EXEC/mission-timeline.js" \
"$DATA/mission-timeline-events.json"
do

if [ -f "$file" ]; then
cp "$file" "$BACKUP/"
fi

done


echo ""
echo "Creating Mission Timeline Event Store..."

cat > "$DATA/mission-timeline-events.json" <<'EOF'
[
 {
  "mission":"MISSION-CON-001",
  "name":"Construction Permit Delay",
  "vertical":"construction",
  "events":[
   "Mission Created",
   "SAP Phase Classified: WIP",
   "Digital Twin Impact Generated",
   "Construction War Room Activated",
   "Strategist Recommendation Generated",
   "Executive Decision Created",
   "Sentinel Evidence Sealed"
  ]
 },

 {
  "mission":"MISSION-HC-001",
  "name":"Healthcare Claim Denial",
  "vertical":"healthcare",
  "events":[
   "Mission Created",
   "SAP Phase Classified: O2C",
   "Claim Impact Analysis Complete",
   "Healthcare War Room Activated",
   "Revenue Cycle Agent Review",
   "Appeal Decision Generated",
   "Compliance Evidence Stored"
  ]
 },

 {
  "mission":"MISSION-FIN-001",
  "name":"Vendor Invoice Exception",
  "vertical":"finops",
  "events":[
   "Mission Created",
   "SAP Phase Classified: P2P",
   "Vendor Dependency Mapped",
   "FinOps War Room Activated",
   "Approval Workflow Triggered",
   "Finance Decision Recorded",
   "Sentinel Audit Complete"
  ]
 }
]
EOF


echo "CREATED:"
echo "$DATA/mission-timeline-events.json"



echo ""
echo "Installing Mission Timeline Runtime..."


cat > "$RUNTIME/mission-timeline-engine.js" <<'EOF'
(function(){

window.TSMMissionTimeline = {


events:{},


load(){

return fetch(
"data/enterprise-lab/mission-timeline-events.json"
)
.then(r=>r.json())
.then(data=>{

data.forEach(m=>{

this.events[m.mission]=m;

});

return this.events;

});

},


getMission(id){

return this.events[id] || null;

},


render(id,target){

let mission=this.getMission(id);

if(!mission) return;


let html="";

mission.events.forEach((event,index)=>{

html += `

<div class="timeline-event">

<strong>
${index+1}.
</strong>

${event}

</div>

`;

});


document.querySelector(target).innerHTML=html;


}


};


})();
EOF


echo "CREATED:"
echo "$RUNTIME/mission-timeline-engine.js"



echo ""
echo "Creating Executive Timeline UI..."


cat > "$EXEC/mission-timeline.html" <<'EOF'
<!DOCTYPE html>

<html>

<head>

<title>
TSM Mission Timeline
</title>


<style>

body{
font-family:Arial;
padding:40px;
background:#0f172a;
color:white;
}


.card{

background:#1e293b;
padding:25px;
border-radius:12px;
margin-bottom:20px;

}


.timeline-event{

padding:15px;
margin:10px 0;
background:#334155;
border-left:5px solid #38bdf8;

}


button{

padding:12px;
margin:5px;
cursor:pointer;

}

</style>


</head>


<body>


<h1>
TSM Enterprise Mission Timeline
</h1>


<div class="card">


<button onclick="loadMission('MISSION-CON-001')">
Construction Permit Delay
</button>


<button onclick="loadMission('MISSION-HC-001')">
Healthcare Claim Denial
</button>


<button onclick="loadMission('MISSION-FIN-001')">
Vendor Invoice Exception
</button>


</div>



<div class="card">

<h2>
Execution Timeline
</h2>


<div id="timeline">

Select Mission

</div>


</div>



<script src="/shared/runtime/enterprise/mission-timeline-engine.js"></script>


<script>

TSMMissionTimeline.load();


function loadMission(id){

TSMMissionTimeline.render(
id,
"#timeline"
);

}

</script>


</body>

</html>
EOF


echo "CREATED:"
echo "$EXEC/mission-timeline.html"



echo ""
echo "Creating report..."

cat > "$REPORT" <<EOF

TSM Enterprise Mission Timeline Console

STATUS:
READY


CREATED:

Mission Timeline Runtime
Mission Event Store
Executive Timeline UI


CONNECTED:

Mission Engine
SAP Intelligence
Digital Twin
War Rooms
Decision Engine
Sentinel Governance


FLOW:

Mission
 |
SAP
 |
Digital Twin
 |
War Room
 |
Decision
 |
Evidence
 |
Executive Update

EOF



echo ""
echo "=========================================="
echo "MISSION TIMELINE CONSOLE READY"
echo ""
echo "Open:"
echo "$EXEC/mission-timeline.html"
echo ""
echo "Report:"
echo "$REPORT"
echo "=========================================="