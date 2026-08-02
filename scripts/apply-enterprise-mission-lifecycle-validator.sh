#!/bin/bash

set -e

echo "=========================================="
echo "TSM Enterprise Mission Lifecycle Validator"
echo "=========================================="

RUNTIME="html/shared/runtime/enterprise"
DATA="data/enterprise-lab"
REPORT="reports/mission-lifecycle-validator-report.txt"

mkdir -p "$RUNTIME"
mkdir -p "$DATA"
mkdir -p reports


BACKUP="backups/mission-validator/$(date +%Y%m%d_%H%M%S)"

echo ""
echo "Creating backup..."

mkdir -p "$BACKUP"


for file in \
"$RUNTIME/mission-lifecycle-validator.js" \
"$DATA/mission-validation-rules.json" \
"$RUNTIME/mission-validator-manifest.json"
do

if [ -f "$file" ]; then
cp "$file" "$BACKUP/"
fi

done


echo "Backup:"
echo "$BACKUP"



echo ""
echo "Installing Mission Lifecycle Validator..."


cat > "$RUNTIME/mission-lifecycle-validator.js" <<'EOF'
(function(){

window.TSMMissionLifecycleValidator = {


validate(mission){

const validation = {

missionId:
mission.id || "UNKNOWN",

status:
"PASSED",

checks:{},

timestamp:
new Date().toISOString()

};


// Mission Creation Check

validation.checks.missionCreated =
!!mission.id;


// SAP Phase Check

validation.checks.sapPhaseAssigned =
!!mission.sapPhase;


// Digital Twin Check

validation.checks.digitalTwinImpact =
!!(
window.TSMDigitalTwin &&
mission.vertical
);


// War Room Routing Check

validation.checks.warRoomAssigned =
!!(
mission.vertical
);


// Sentinel Evidence Check

validation.checks.sentinelReady =
!!(
window.TSMSentinel ||
window.TSMSentinelGovernance
);


// Evaluate

Object.values(
validation.checks
)
.forEach(
check=>{

if(!check){

validation.status =
"REVIEW_REQUIRED";

}

});


return validation;


},



audit(mission){


const result =
this.validate(mission);



window.dispatchEvent(

new CustomEvent(
"TSM_MISSION_VALIDATION_COMPLETE",
{
detail:result
}

)

);


return result;


}


};


})();
EOF


echo "CREATED:"
echo "$RUNTIME/mission-lifecycle-validator.js"



echo ""
echo "Creating Validation Rules..."


cat > "$DATA/mission-validation-rules.json" <<'EOF'
{

"name":
"TSM Enterprise Mission Validation Rules",


"requiredChecks":

[

"missionCreated",

"sapPhaseAssigned",

"digitalTwinImpact",

"warRoomAssigned",

"sentinelReady"

],


"failureAction":

"REVIEW_REQUIRED",


"successAction":

"ALLOW_EXECUTION"


}
EOF


echo "CREATED:"
echo "$DATA/mission-validation-rules.json"



echo ""
echo "Creating Mission Audit Manifest..."


cat > "$RUNTIME/mission-validator-manifest.json" <<'EOF'
{

"name":
"TSM Mission Lifecycle Validator",

"purpose":
"Enterprise mission quality gate",


"position":

[
"Mission Orchestrator",
"SAP Intelligence",
"Digital Twin",
"War Room Runtime",
"Sentinel Governance"
],


"validationFlow":

[

"Mission Created",

"SAP Classification",

"Impact Analysis",

"War Room Activation",

"Sentinel Evidence",

"Executive Visibility"

]

}
EOF


echo "CREATED:"
echo "$RUNTIME/mission-validator-manifest.json"



echo ""
echo "Generating report..."


cat > "$REPORT" <<EOF
TSM Enterprise Mission Lifecycle Validator

STATUS:
READY


CREATED:

Mission Lifecycle Validator
Validation Rules
Validator Manifest


CONNECTED:

Mission Orchestrator
SAP Phase Intelligence
Digital Twin
War Room Control Plane
Sentinel Governance
Executive Command Center


MISSION FLOW:

Mission
 |
Validation Gate
 |
SAP Phase
 |
Digital Twin
 |
War Room
 |
Decision
 |
Evidence


EOF



echo ""
echo "=========================================="
echo "MISSION LIFECYCLE VALIDATOR READY"
echo ""
echo "Report:"
echo "$REPORT"
echo "=========================================="