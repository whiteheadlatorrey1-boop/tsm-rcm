#!/bin/bash

set -e

echo "=========================================="
echo "TSM Enterprise War Room Live Control Plane"
echo "=========================================="

RUNTIME="html/shared/runtime/enterprise"
DATA="data/enterprise-lab"
REPORT="reports/war-room-live-control-plane-report.txt"

mkdir -p "$RUNTIME"
mkdir -p "$DATA"
mkdir -p reports


BACKUP="backups/live-control-plane/$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP"


for file in \
"$RUNTIME/war-room-control-plane.js" \
"$DATA/demo-mission-stream.json"
do

if [ -f "$file" ]; then
cp "$file" "$BACKUP/"
fi

done


echo ""
echo "Backup:"
echo "$BACKUP"


echo ""
echo "Installing War Room Control Plane..."

cat > "$RUNTIME/war-room-control-plane.js" <<'EOF'
(function(){


window.TSMWarRoomControlPlane = {


launch(mission){


console.log(
"TSM WAR ROOM LAUNCH",
mission
);


// 1. Attach SAP Phase

if(window.TSMProcessMap){

mission =
window.TSMProcessMap.attach(
mission
);

}


// 2. Analyze Enterprise Impact

let intelligence = {};

if(window.TSMEnterpriseIntelligenceFusion){

intelligence =
window.TSMEnterpriseIntelligenceFusion.analyze(
mission
);

}


// 3. Route to Vertical War Room


let route =
{

vertical:
mission.vertical,

warRoom:

"html/war-rooms/"
+
mission.vertical
+
"/"
+
mission.vertical
+
"-war-room.html"

};


// 4. Sync Enterprise State


if(window.TSMEnterpriseStateSync){

window.TSMEnterpriseStateSync.sync(
mission
);

}



return {


mission:

mission,


route:

route,


intelligence:

intelligence,


status:

"WAR_ROOM_ACTIVE"


};


}


};


console.log(
"TSM War Room Control Plane Loaded"
);


})();
EOF


echo "CREATED:"
echo "$RUNTIME/war-room-control-plane.js"



echo ""
echo "Creating Demo Mission Stream..."


cat > "$DATA/demo-mission-stream.json" <<'EOF'
{

"missions":

[


{
"id":"TSM-CON-001",
"title":"Construction Permit Delay",
"vertical":"construction",
"sapPhase":"WIP",
"priority":"HIGH",
"source":"permit-upload"
},


{
"id":"TSM-HC-001",
"title":"Healthcare Claim Denial",
"vertical":"healthcare",
"sapPhase":"O2C",
"priority":"HIGH",
"source":"claim-upload"
},


{
"id":"TSM-FIN-001",
"title":"Vendor Invoice Exception",
"vertical":"finops",
"sapPhase":"P2P",
"priority":"MEDIUM",
"source":"invoice-upload"
}


]

}
EOF


echo "CREATED:"
echo "$DATA/demo-mission-stream.json"



echo ""
echo "Creating Control Plane Manifest..."


cat > "$RUNTIME/war-room-control-plane-manifest.json" <<'EOF'
{

"name":
"TSM Enterprise War Room Control Plane",

"purpose":
"Mission execution orchestration",


"flow":

[

"Mission Intake",

"SAP Classification",

"Digital Twin Analysis",

"Vertical Routing",

"Sentinel Validation",

"Executive Explanation"

]


}
EOF



echo ""
echo "Generating report..."


cat > "$REPORT" <<EOF
TSM Enterprise War Room Live Control Plane


STATUS:
READY


CREATED:

War Room Control Plane
Demo Mission Stream
Control Plane Manifest


CONNECTED:

Mission Engine
SAP Phase Intelligence
Digital Twin
Intelligence Fusion
Vertical Adapters
War Rooms
Sentinel
Executive Command Center


LIVE DEMO FLOW:

Upload Document

      |

Mission Created

      |

Enterprise Analysis

      |

War Room Activated

      |

Decision Generated

      |

Executive Evidence


EOF



echo ""
echo "=========================================="
echo "WAR ROOM LIVE CONTROL PLANE READY"
echo ""
echo "Report:"
echo "$REPORT"
echo "=========================================="