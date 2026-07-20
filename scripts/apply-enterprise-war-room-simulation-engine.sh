#!/bin/bash

set -e

echo "=========================================="
echo "TSM Enterprise War Room Simulation Engine"
echo "=========================================="

RUNTIME="html/shared/runtime/enterprise"
DATA="data/enterprise-lab"
EXEC="html/executive-command-center"
REPORT="reports/war-room-simulation-engine-report.txt"

mkdir -p "$RUNTIME"
mkdir -p "$DATA"
mkdir -p "$EXEC"
mkdir -p reports


BACKUP="backups/war-room-simulation/$(date +%Y%m%d_%H%M%S)"

echo ""
echo "Creating backup..."

mkdir -p "$BACKUP"


for file in \
"$RUNTIME/war-room-simulation-engine.js" \
"$DATA/simulation-scenarios.json" \
"$EXEC/simulation-manifest.json"
do

if [ -f "$file" ]; then
cp "$file" "$BACKUP/"
fi

done


echo "Backup:"
echo "$BACKUP"


echo ""
echo "Creating Simulation Scenarios..."


cat > "$DATA/simulation-scenarios.json" <<'EOF'
{

"scenarios":[


{
"id":"SIM-CONSTRUCTION-001",
"name":"Construction Material Delay Crisis",
"vertical":"construction",
"sapPhase":"WIP",
"mission":
"Critical supplier delay impacts project completion",
"severity":"HIGH"
},


{
"id":"SIM-HEALTHCARE-001",
"name":"Healthcare Claims Denial Surge",
"vertical":"healthcare",
"sapPhase":"O2C",
"mission":
"Payer denial spike impacts revenue cycle",
"severity":"HIGH"
},


{
"id":"SIM-FINOPS-001",
"name":"Finance Invoice Exception",
"vertical":"finops",
"sapPhase":"P2P",
"mission":
"Invoice mismatch requires procurement review",
"severity":"MEDIUM"
}


]

}
EOF


echo "CREATED:"
echo "$DATA/simulation-scenarios.json"



echo ""
echo "Installing War Room Simulation Engine..."


cat > "$RUNTIME/war-room-simulation-engine.js" <<'EOF'
(function(){


window.TSMWarRoomSimulation = {


run(scenario){


const mission = {


id:
scenario.id,


vertical:
scenario.vertical,


sapPhase:
scenario.sapPhase,


objective:
scenario.mission,


severity:
scenario.severity,


created:
new Date().toISOString()


};



console.log(
"TSM SIMULATION START",
mission
);



if(window.TSMProcessMap){

window.TSMProcessMap.attach(
mission
);

}



if(window.TSMMissionLifecycleValidator){

mission.validation =
window.TSMMissionLifecycleValidator.validate(
mission
);

}



if(window.TSMEnterpriseStateSync){

window.TSMEnterpriseStateSync.sync(
mission
);

}



if(window.TSMSentinelGovernance){

window.TSMSentinelGovernance.record(
mission
);

}



window.dispatchEvent(

new CustomEvent(
"TSM_SIMULATION_COMPLETE",
{
detail:mission
}

)

);


return mission;


}



};


})();
EOF


echo "CREATED:"
echo "$RUNTIME/war-room-simulation-engine.js"



echo ""
echo "Creating Simulation Manifest..."


cat > "$EXEC/simulation-manifest.json" <<'EOF'
{

"name":
"TSM Enterprise War Room Simulation Engine",


"purpose":
"Executive demonstration lifecycle",


"flow":

[

"Scenario Selected",

"Mission Created",

"SAP Phase Assigned",

"Digital Twin Impact",

"War Room Activation",

"Sentinel Evidence",

"Executive Outcome"

]

}
EOF


echo "CREATED:"
echo "$EXEC/simulation-manifest.json"



echo ""
echo "Generating Report..."


cat > "$REPORT" <<EOF
TSM Enterprise War Room Simulation Engine

STATUS:
READY


CREATED:

Simulation Engine
Scenario Library
Simulation Manifest


CONNECTED:

SAP Phase Intelligence
Digital Twin
War Room Runtime
Mission Validator
Sentinel Governance
Executive Command Center


DEMO FLOW:

Scenario
 |
Mission
 |
SAP Phase
 |
Digital Twin
 |
War Room
 |
Evidence
 |
Executive Decision


EOF


echo ""
echo "=========================================="
echo "WAR ROOM SIMULATION ENGINE READY"
echo ""
echo "Report:"
echo "$REPORT"
echo "=========================================="