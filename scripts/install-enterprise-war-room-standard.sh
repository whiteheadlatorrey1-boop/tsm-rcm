#!/bin/bash

set -e

ROOT=$(pwd)

echo "=========================================="
echo "TSM Enterprise War Room Standard Installer"
echo "=========================================="

mkdir -p html/war-rooms
mkdir -p html/shared/runtime/enterprise
mkdir -p data/enterprise-lab
mkdir -p reports


VERTICALS=(
construction
healthcare
finops
mortgage
real-estate
legal
insurance
bpo
schools
)


echo ""
echo "Checking existing vertical assets..."
echo ""


for V in "${VERTICALS[@]}"
do

echo "---- $V ----"

if [ -d "html/war-rooms/$V" ]; then
 echo "EXISTS: war-room folder"
else
 mkdir -p html/war-rooms/$V
 echo "CREATED: war-room folder"
fi


for FILE in \
"$V-war-room.html" \
"$V-strategist.html" \
"$V-executive-portal.html" \
"workflow.json" \
"scenarios.json"

do

TARGET="html/war-rooms/$V/$FILE"


if [ -f "$TARGET" ]; then

echo "FOUND $TARGET"

else

echo "CREATING $TARGET"


cat > "$TARGET" <<EOF
<!DOCTYPE html>
<html>
<head>
<title>TSM $V War Room</title>
</head>

<body>

<h1>TSM $V Enterprise War Room</h1>

<div id="mission"></div>
<div id="sap-phases"></div>
<div id="sentinel"></div>


<script src="../../shared/runtime/enterprise/enterprise-runtime.js"></script>

<script>

TSMEnterpriseRuntime.launch({

vertical:"$V",

mode:"pilot",

sentinel:true,

sap:true

});

</script>

</body>
</html>
EOF


fi

done

done



echo ""
echo "Installing enterprise runtime..."
echo ""

RUNTIME="html/shared/runtime/enterprise"


create_file(){

FILE=$1

if [ -f "$RUNTIME/$FILE" ]
then
echo "FOUND $FILE"
else
echo "CREATE $FILE"

cat > "$RUNTIME/$FILE"

fi

}



cat > $RUNTIME/vertical-registry.js <<'EOF'

window.TSMVerticalRegistry={

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

]

};

EOF



cat > $RUNTIME/sap-phase-registry.js <<'EOF'

window.TSMSAPPhaseRegistry={


phases:{


O2C:[
"Quote",
"Order",
"Fulfillment",
"Invoice",
"Payment"
],


MDM:[
"Identity",
"Quality",
"Governance",
"Merge"
],


GOV:[
"Risk",
"Compliance",
"Audit"
],


WIP:[
"Planning",
"Execution",
"Completion"
]


}

};

EOF



cat > $RUNTIME/mission-engine.js <<'EOF'

window.TSMMissionEngine={


create:function(mission){

console.log(
"MISSION CREATED",
mission
);


window.dispatchEvent(

new CustomEvent(
"TSM_MISSION_CREATED",
{
detail:mission
}

)

);

}


};

EOF



cat > $RUNTIME/strategist-relay.js <<'EOF'

window.TSMStrategistRelay={

send:function(payload){

console.log(
"Strategist Relay",
payload
);

}

};

EOF



cat > $RUNTIME/executive-relay.js <<'EOF'

window.TSMExecutiveRelay={

send:function(payload){

console.log(
"Executive Portal Relay",
payload
);

}

};

EOF



cat > $RUNTIME/sentinel-bridge.js <<'EOF'


window.TSMSentinel={


evaluate:function(data){

return {

score:92,

status:"HEALTHY",

explanation:
"Enterprise posture evaluated"

};

}


};


EOF



cat > $RUNTIME/digital-twin-sync.js <<'EOF'

window.TSMDigitalTwin={


sync:function(asset){

console.log(
"DIGITAL TWIN UPDATE",
asset
);

}

};

EOF



cat > $RUNTIME/enterprise-runtime.js <<'EOF'

window.TSMEnterpriseRuntime={


launch:function(config){


console.log(
"TSM ENTERPRISE RUNTIME",
config
);



TSMMissionEngine.create({

vertical:config.vertical,

sap_phase:"O2C",

sentinel:true,

timestamp:new Date()

});


TSMExecutiveRelay.send({

destination:
"executive-portal",

vertical:
config.vertical

});


}


};

EOF



echo ""
echo "Creating Enterprise Lab simulation data..."


cat > data/enterprise-lab/business-users.json <<'EOF'
{

"users":[

{
"name":"Sarah CFO",
"role":"Executive"
},

{
"name":"Mike Operations",
"role":"Manager"
},

{
"name":"Jessica Analyst",
"role":"Operator"
}

]

}

EOF



cat > data/enterprise-lab/assets.json <<'EOF'
{

"devices":[

"ERP Server",
"Workstations",
"Mobile Devices"

],

"services":[

"SAP",
"CRM",
"Accounting",
"HR"

]

}

EOF



echo ""
echo "Generating audit report..."

find html/war-rooms -maxdepth 2 -type f \
> reports/enterprise-war-room-install-report.txt


echo ""
echo "=========================================="
echo "INSTALL COMPLETE"
echo "Report:"
echo "reports/enterprise-war-room-install-report.txt"
echo "=========================================="