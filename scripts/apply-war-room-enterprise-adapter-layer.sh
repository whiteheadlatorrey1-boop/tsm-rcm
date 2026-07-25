#!/bin/bash

set -e

echo "=========================================="
echo "TSM War Room Enterprise Adapter Installer"
echo "=========================================="

ADAPTER_DIR="html/shared/runtime/adapters"
REPORT="reports/war-room-adapter-install-report.txt"

mkdir -p "$ADAPTER_DIR"
mkdir -p reports

echo "TSM WAR ROOM ADAPTER INSTALL" > "$REPORT"
echo "============================" >> "$REPORT"


create_adapter(){

VERTICAL=$1
SAP=$2

FILE="$ADAPTER_DIR/${VERTICAL}-runtime-adapter.js"


if [ -f "$FILE" ]; then

echo "EXISTS:"
echo "$FILE"

echo "EXISTS $FILE" >> "$REPORT"

else

echo "CREATING:"
echo "$FILE"


cat > "$FILE" <<EOT
/*
 TSM Enterprise Vertical Adapter
 Vertical: $VERTICAL
*/

window.TSMVerticalAdapters =
window.TSMVerticalAdapters || {};


window.TSMVerticalAdapters["$VERTICAL"] = {


vertical:"$VERTICAL",


sapPhases:[
$SAP
],


createMission(payload){

const mission = {

id:
"TSM-$VERTICAL-"+Date.now(),

vertical:
this.vertical,


sapPhases:
this.sapPhases,


payload,


created:
new Date()

};


if(window.TSMMissionEngine){

return window.TSMMissionEngine.createMission(
mission
);

}


return mission;


},



sendToStrategist(data){

if(window.TSMStrategistRelay){

window.TSMStrategistRelay.send({

vertical:this.vertical,

...data

});

}


},



sendToExecutive(data){

if(window.TSMExecutiveRelay){

window.TSMExecutiveRelay.send({

vertical:this.vertical,

...data

});

}


},



sendToSentinel(data){

if(window.TSMSentinelRelay){

window.TSMSentinelRelay.observe({

vertical:this.vertical,

...data

});

}


}



};


console.log(
"TSM Adapter Loaded:",
"$VERTICAL"
);

EOT


echo "CREATED $FILE" >> "$REPORT"

fi

}



create_adapter construction \
'"WBS","Project Systems","Procurement","Change Orders"'


create_adapter healthcare \
'"Patient Billing","Claims","Revenue Cycle","Denials"'


create_adapter finops \
'"P2P","O2C","GL Close","Vendor Management"'


create_adapter mortgage \
'"Loan Origination","Underwriting","Closing"'


create_adapter real-estate \
'"Asset Management","Lease Operations","Property Accounting"'


create_adapter legal \
'"Contract Lifecycle","Compliance","Matter Management"'


create_adapter insurance \
'"Claims","Underwriting","Policy Administration"'


create_adapter bpo \
'"Service Delivery","SLA Management","Workforce Operations"'


create_adapter schools \
'"Student Lifecycle","Enrollment","Finance Operations"'



echo
echo "=========================================="
echo "REGISTERING ADAPTER MANIFEST"
echo "=========================================="


cat > "$ADAPTER_DIR/adapter-registry.js" <<'EOT'
/*
 TSM Enterprise Adapter Registry
*/

window.TSMAdapterRegistry = {


verticals:[

"construction",
"healthcare",
"finops",
"mortgage",
"real-estate",
"legal",
"insurance",
"bpo",
"schools"

],


load(){

console.log(
"TSM Adapter Registry Loaded"
);

}


};


EOT


echo "CREATED adapter-registry.js" >> "$REPORT"



echo
echo "=========================================="
echo "WAR ROOM ADAPTER LAYER READY"
echo
echo "Adapters:"
ls "$ADAPTER_DIR"
echo
echo "Report:"
echo "$REPORT"
echo "=========================================="
