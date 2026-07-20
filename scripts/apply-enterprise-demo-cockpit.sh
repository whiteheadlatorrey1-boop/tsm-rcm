#!/bin/bash

set -e

echo "=========================================="
echo "TSM Enterprise Executive Demo Cockpit"
echo "=========================================="

EXEC="html/executive-command-center"
RUNTIME="html/shared/runtime/enterprise"
REPORT="reports/executive-demo-cockpit-report.txt"


mkdir -p "$EXEC"
mkdir -p reports


BACKUP="backups/demo-cockpit/$(date +%Y%m%d_%H%M%S)"

echo ""
echo "Creating backup..."

mkdir -p "$BACKUP"


for file in \
"$EXEC/demo-cockpit.html" \
"$EXEC/demo-cockpit.js" \
"$EXEC/demo-cockpit-config.json"
do

if [ -f "$file" ]; then
cp "$file" "$BACKUP/"
fi

done


echo "Backup:"
echo "$BACKUP"



echo ""
echo "Creating Demo Cockpit Configuration..."


cat > "$EXEC/demo-cockpit-config.json" <<'EOF'
{

"name":
"TSM Enterprise Demo Cockpit",

"scenarios":

[

{
"id":"SIM-CONSTRUCTION-001",
"name":"Construction Crisis",
"vertical":"construction"
},

{
"id":"SIM-HEALTHCARE-001",
"name":"Healthcare Denial Surge",
"vertical":"healthcare"
},

{
"id":"SIM-FINOPS-001",
"name":"SAP Invoice Exception",
"vertical":"finops"
}

]

}
EOF



echo "CREATED:"
echo "$EXEC/demo-cockpit-config.json"



echo ""
echo "Creating Demo Cockpit Runtime..."


cat > "$EXEC/demo-cockpit.js" <<'EOF'
(function(){


window.TSMDemoCockpit = {


launch(id){


fetch(
"data/enterprise-lab/simulation-scenarios.json"
)
.then(
r=>r.json()
)
.then(
data=>{


const scenario =
data.scenarios.find(
s=>s.id===id
);


if(!scenario){

console.error(
"Scenario not found"
);

return;

}


if(window.TSMWarRoomSimulation){

const result =
window.TSMWarRoomSimulation.run(
scenario
);


console.log(
"DEMO COMPLETE",
result
);

}


}

);


}


};


})();
EOF



echo "CREATED:"
echo "$EXEC/demo-cockpit.js"



echo ""
echo "Creating Demo Cockpit UI..."


cat > "$EXEC/demo-cockpit.html" <<'EOF'
<!DOCTYPE html>

<html>

<head>

<title>
TSM Enterprise Demo Cockpit
</title>


<style>

body{
font-family:Arial;
padding:40px;
background:#111;
color:white;
}


button{

padding:18px;
margin:10px;
font-size:18px;
cursor:pointer;

}


.card{

border:1px solid #444;
padding:20px;
margin:20px;

}

</style>

</head>


<body>


<h1>
TSM Enterprise Command Cockpit
</h1>


<div class="card">

<h2>
Launch Enterprise Simulations
</h2>


<button onclick="launch('SIM-CONSTRUCTION-001')">
Construction Crisis
</button>


<button onclick="launch('SIM-HEALTHCARE-001')">
Healthcare Denial Event
</button>


<button onclick="launch('SIM-FINOPS-001')">
SAP P2P Exception
</button>


</div>



<div id="status">

READY

</div>



<script src="../shared/runtime/enterprise/war-room-simulation-engine.js"></script>

<script src="demo-cockpit.js"></script>


<script>

function launch(id){

document.getElementById("status").innerHTML =
"RUNNING "+id;


TSMDemoCockpit.launch(id);


}


</script>


</body>

</html>
EOF



echo "CREATED:"
echo "$EXEC/demo-cockpit.html"



echo ""
echo "Generating Report..."


cat > "$REPORT" <<EOF
TSM Enterprise Executive Demo Cockpit

STATUS:
READY


CREATED:

Demo Cockpit UI
Demo Controller
Scenario Configuration


CONNECTED:

War Room Simulation Engine
Mission Validator
SAP Intelligence
Digital Twin
Sentinel Governance


EXECUTIVE FLOW:

Click Scenario
 |
Create Mission
 |
Assign SAP Phase
 |
Analyze Impact
 |
Activate War Room
 |
Capture Evidence
 |
Display Outcome


EOF



echo ""
echo "=========================================="
echo "EXECUTIVE DEMO COCKPIT READY"
echo ""
echo "Open:"
echo "$EXEC/demo-cockpit.html"
echo ""
echo "Report:"
echo "$REPORT"
echo "=========================================="