#!/bin/bash

set -e

echo "=========================================="
echo "TSM Enterprise Executive Demo Launcher"
echo "=========================================="

RUNTIME="html/shared/runtime/enterprise"
EXEC="html/executive-command-center"
DATA="data/enterprise-lab"
REPORT="reports/executive-demo-launcher-report.txt"

mkdir -p "$RUNTIME"
mkdir -p "$EXEC"
mkdir -p "$DATA"
mkdir -p reports


BACKUP="backups/executive-demo-launcher/$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP"


for file in \
"$RUNTIME/executive-demo-controller.js" \
"$EXEC/demo-launcher.html" \
"$EXEC/demo-launcher.js" \
"$EXEC/demo-scenarios.json"
do

if [ -f "$file" ]; then
cp "$file" "$BACKUP/"
fi

done


echo ""
echo "Backup:"
echo "$BACKUP"


echo ""
echo "Creating Executive Demo Scenarios..."


cat > "$EXEC/demo-scenarios.json" <<'EOF'
{
"scenarios":

[

{
"id":"DEMO-CON-001",
"name":"Construction Permit Delay",
"vertical":"construction",
"priority":"HIGH",
"sapPhase":"WIP",
"description":
"Permit approval delay impacting active construction project timeline.",
"mission":
{
"type":"FIELD_OPERATIONS_EXCEPTION",
"impact":
[
"Project Schedule",
"Vendor Coordination",
"Field Resources"
]
}
},


{
"id":"DEMO-HC-001",
"name":"Healthcare Claim Denial",
"vertical":"healthcare",
"priority":"HIGH",
"sapPhase":"O2C",
"description":
"Payer denial creating revenue cycle exposure.",
"mission":
{
"type":"REVENUE_CYCLE_EXCEPTION",
"impact":
[
"Claims",
"Cash Flow",
"Payer Operations"
]
}
},


{
"id":"DEMO-FIN-001",
"name":"Vendor Invoice Exception",
"vertical":"finops",
"priority":"MEDIUM",
"sapPhase":"P2P",
"description":
"Invoice mismatch requiring procurement review.",
"mission":
{
"type":"PROCUREMENT_EXCEPTION",
"impact":
[
"Vendor Payment",
"Purchase Orders",
"Finance Controls"
]
}
}

]

}
EOF


echo "CREATED:"
echo "$EXEC/demo-scenarios.json"



echo ""
echo "Installing Executive Demo Controller..."


cat > "$RUNTIME/executive-demo-controller.js" <<'EOF'
(function(){


window.TSMExecutiveDemoController = {


launchScenario(scenario){


console.log(
"Launching TSM Enterprise Demo Mission",
scenario
);



let mission = {


id:
scenario.id,


title:
scenario.name,


vertical:
scenario.vertical,


priority:
scenario.priority,


sapPhase:
scenario.sapPhase,


source:
"executive-demo-launcher",


details:
scenario.mission


};



let result = {};


// War Room Control Plane

if(window.TSMWarRoomControlPlane){

result =
window.TSMWarRoomControlPlane.launch(
mission
);

}


return result;


},



loadScenarios(){


return fetch(
"demo-scenarios.json"
)
.then(
r=>r.json()
);


}


};



console.log(
"TSM Executive Demo Controller Loaded"
);


})();
EOF


echo "CREATED:"
echo "$RUNTIME/executive-demo-controller.js"



echo ""
echo "Creating Demo Launcher UI..."


cat > "$EXEC/demo-launcher.html" <<'EOF'
<!DOCTYPE html>

<html>

<head>

<title>
TSM Enterprise Demo Launcher
</title>


<style>

body{
font-family:Arial;
padding:40px;
}


button{

padding:15px;
margin:10px;
font-size:16px;

}

.card{

border:1px solid #ccc;
padding:20px;
margin:15px;

}

</style>


</head>


<body>


<h1>
TSM Enterprise Executive Demo Launcher
</h1>


<p>
Mission → SAP → Digital Twin → War Room → Sentinel → Executive Decision
</p>


<div id="scenarios"></div>



<script src="../shared/runtime/enterprise/war-room-control-plane.js"></script>

<script src="../shared/runtime/enterprise/process-map-engine.js"></script>

<script src="../shared/runtime/enterprise/digital-twin-engine.js"></script>

<script src="../shared/runtime/enterprise/intelligence-fusion-engine.js"></script>

<script src="../shared/runtime/enterprise/sentinel-governance-engine.js"></script>

<script src="demo-launcher.js"></script>


</body>

</html>
EOF


echo "CREATED:"
echo "$EXEC/demo-launcher.html"



echo ""
echo "Creating Launcher Runtime..."


cat > "$EXEC/demo-launcher.js" <<'EOF'

(async function(){


const response =
await fetch(
"demo-scenarios.json"
);


const data =
await response.json();



const container =
document.getElementById(
"scenarios"
);



data.scenarios.forEach(
scenario=>{


let card =
document.createElement(
"div"
);


card.className="card";


card.innerHTML=

`

<h2>${scenario.name}</h2>

<p>
Vertical:
${scenario.vertical}
</p>

<p>
SAP Phase:
${scenario.sapPhase}
</p>

<button>
Launch Mission
</button>

`;



card.querySelector(
"button"
)
.onclick=()=>{


let result =
TSMExecutiveDemoController.launchScenario(
scenario
);


console.log(
"DEMO RESULT",
result
);


alert(
"TSM Mission Launched: "
+
scenario.id
);


};



container.appendChild(card);


}

);


})();
EOF


echo "CREATED:"
echo "$EXEC/demo-launcher.js"



echo ""
echo "Creating Report..."


cat > "$REPORT" <<EOF
TSM Enterprise Executive Demo Launcher

STATUS:
READY


CREATED:

Executive Demo Controller
Demo Scenario Library
Executive Launcher UI


CONNECTED:

Mission Engine
SAP Phase Intelligence
Digital Twin
Intelligence Fusion
War Room Control Plane
Sentinel Governance
Executive Command Center


AVAILABLE DEMOS:

Construction Permit Delay
Healthcare Claim Denial
FinOps Invoice Exception


FLOW:

Launch Scenario

 |

Mission Created

 |

SAP Classification

 |

Digital Twin Analysis

 |

War Room Activation

 |

Sentinel Review

 |

Executive Decision


EOF



echo ""
echo "=========================================="
echo "EXECUTIVE DEMO LAUNCHER READY"
echo ""
echo "Open:"
echo "$EXEC/demo-launcher.html"
echo ""
echo "Report:"
echo "$REPORT"
echo "=========================================="