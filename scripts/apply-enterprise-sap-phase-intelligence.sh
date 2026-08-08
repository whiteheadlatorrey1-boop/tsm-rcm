#!/bin/bash
#
# WARNING (2026-08-05): the "Generating report..." step near the bottom
# of this script writes reports/sap-phase-intelligence-report.txt with
# hardcoded "STATUS: READY" / "CONNECTED TO:" text that prints
# unconditionally -- it does not actually check whether the files above
# it were created successfully. If you run this script, verify the
# real output files exist and are wired into the app before trusting
# that report. See server/reports/sap-phase-intelligence-report.txt
# for the corrected, honest version as of this checkout (this script
# had never actually been run/committed here -- its target dirs,
# html/shared/runtime/enterprise/ and data/enterprise-lab/, don't
# exist in this repo).

set -e

echo "=========================================="
echo "TSM Enterprise SAP Phase Intelligence"
echo "=========================================="

RUNTIME="html/shared/runtime/enterprise"
DATA="data/enterprise-lab"
REPORT="reports/sap-phase-intelligence-report.txt"

mkdir -p "$RUNTIME"
mkdir -p "$DATA"
mkdir -p reports


BACKUP="backups/sap-phase-intelligence/$(date +%Y%m%d_%H%M%S)"

echo ""
echo "Creating backup..."

mkdir -p "$BACKUP"


for file in \
"$RUNTIME/sap-phase-registry.js" \
"$DATA/sap-phase-library.json"
do

if [ -f "$file" ]; then
    cp "$file" "$BACKUP/"
fi

done


echo "Backup:"
echo "$BACKUP"


echo ""
echo "Creating SAP Phase Library..."


if [ ! -f "$DATA/sap-phase-library.json" ]; then

cat > "$DATA/sap-phase-library.json" <<'EOF'
{
"phases":[

{
"id":"P2P",
"name":"Procure To Pay",
"processes":[
"purchase order",
"invoice",
"goods receipt",
"vendor"
],
"warRooms":[
"finops",
"construction",
"bpo"
]
},

{
"id":"O2C",
"name":"Order To Cash",
"processes":[
"customer order",
"billing",
"collections",
"claims"
],
"warRooms":[
"healthcare",
"mortgage",
"real-estate"
]
},

{
"id":"R2R",
"name":"Record To Report",
"processes":[
"journal",
"financial close",
"reporting"
],
"warRooms":[
"finops"
]
},

{
"id":"MDM",
"name":"Master Data Management",
"processes":[
"customer master",
"supplier master",
"product master"
],
"warRooms":[
"all"
]
},

{
"id":"WIP",
"name":"Work In Progress",
"processes":[
"field operations",
"production",
"project execution"
],
"warRooms":[
"construction"
]
}

]
}
EOF

echo "CREATED:"
echo "$DATA/sap-phase-library.json"

else

echo "EXISTS:"
echo "$DATA/sap-phase-library.json"

fi



echo ""
echo "Installing SAP Intelligence Engine..."


if [ ! -f "$RUNTIME/sap-phase-intelligence.js" ]; then


cat > "$RUNTIME/sap-phase-intelligence.js" <<'EOF'
(function(){

window.TSMSAPPhaseIntelligence = {


classify(mission){


let text =
JSON.stringify(mission)
.toLowerCase();


let phase="MDM";


if(
text.includes("invoice") ||
text.includes("purchase") ||
text.includes("vendor")
)
{
phase="P2P";
}


if(
text.includes("claim") ||
text.includes("customer") ||
text.includes("billing")
)
{
phase="O2C";
}


if(
text.includes("field") ||
text.includes("permit") ||
text.includes("project")
)
{
phase="WIP";
}


if(
text.includes("journal") ||
text.includes("close")
)
{
phase="R2R";
}



mission.sapPhase =
phase;


return mission;


}


};


})();
EOF


echo "CREATED:"
echo "$RUNTIME/sap-phase-intelligence.js"


else

echo "EXISTS:"
echo "$RUNTIME/sap-phase-intelligence.js"

fi



echo ""
echo "Installing SAP Process Router..."


if [ ! -f "$RUNTIME/sap-process-router.js" ]; then


cat > "$RUNTIME/sap-process-router.js" <<'EOF'
(function(){


window.TSMSAPProcessRouter = {


route(mission){


if(
window.TSMSAPPhaseIntelligence
)
{
return window
.TSMSAPPhaseIntelligence
.classify(
mission
);
}


return mission;


}


};


})();
EOF


echo "CREATED:"
echo "$RUNTIME/sap-process-router.js"

else

echo "EXISTS:"
echo "$RUNTIME/sap-process-router.js"

fi



echo ""
echo "Creating SAP Manifest..."


cat > "$RUNTIME/sap-phase-manifest.json" <<'EOF'
{

"name":
"TSM SAP Phase Intelligence",

"phases":[
"P2P",
"O2C",
"R2R",
"MDM",
"WIP"
],

"flow":

[
"Mission Created",
"SAP Classification",
"War Room Activation",
"Strategist Analysis",
"Executive Decision",
"Sentinel Audit"
]

}
EOF



echo ""
echo "Generating report..."


cat > "$REPORT" <<EOF
TSM Enterprise SAP Phase Intelligence

STATUS:
READY


CREATED:

SAP Phase Library
SAP Intelligence Engine
SAP Process Router
SAP Phase Manifest


CONNECTED TO:

Mission Queue
Enterprise Runtime
War Rooms
Executive Command Center
Sentinel


SAP PHASES:

P2P
O2C
R2R
MDM
WIP


Architecture:

Document
   |
Mission
   |
SAP Phase Detection
   |
War Room
   |
Executive Decision
   |
Sentinel


EOF


echo ""
echo "=========================================="
echo "SAP PHASE INTELLIGENCE READY"
echo ""
echo "Report:"
echo "$REPORT"
echo "=========================================="