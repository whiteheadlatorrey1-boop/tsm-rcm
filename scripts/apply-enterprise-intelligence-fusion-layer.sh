#!/bin/bash
#
# WARNING (2026-08-05): same issue as
# apply-enterprise-sap-phase-intelligence.sh -- the generated report's
# "STATUS: READY" / "CONNECTED:" text is hardcoded and prints
# unconditionally, not a real check. This script had never actually
# been run/committed in this repo as of this checkout (its target
# dirs, html/shared/runtime/enterprise/ and data/enterprise-lab/,
# don't exist here). See server/reports/enterprise-intelligence-
# fusion-report.txt for the corrected, honest status.

set -e

echo "=========================================="
echo "TSM Enterprise Intelligence Fusion Layer"
echo "=========================================="

RUNTIME="html/shared/runtime/enterprise"
DATA="data/enterprise-lab"
REPORT="reports/enterprise-intelligence-fusion-report.txt"

mkdir -p "$RUNTIME"
mkdir -p "$DATA"
mkdir -p reports


BACKUP="backups/intelligence-fusion/$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP"


for file in \
"$RUNTIME/intelligence-fusion-engine.js" \
"$DATA/intelligence-context.json"
do

if [ -f "$file" ]; then
cp "$file" "$BACKUP/"
fi

done


echo ""
echo "Backup:"
echo "$BACKUP"



echo ""
echo "Installing Intelligence Fusion Engine..."

cat > "$RUNTIME/intelligence-fusion-engine.js" <<'EOF'
(function(){


window.TSMEnterpriseIntelligenceFusion = {


analyze(mission){


let processContext = {};


// Attach SAP Phase
if(window.TSMProcessMap){

mission =
window.TSMProcessMap.attach(
mission
);

}


// Digital Twin Impact

if(window.TSMDigitalTwin){

processContext =
window.TSMDigitalTwin.analyze(
mission
);

}


// Sentinel Check

let sentinel =
{

status:
"PENDING"

};


if(window.TSMSentinelContract){

sentinel =
window.TSMSentinelContract.evaluate(
mission
);

}


// Executive Package

return {


mission:


mission,


enterpriseContext:

{


sapPhase:
mission.sapPhase,


digitalTwin:
processContext,


sentinel:
sentinel


},


decision:

"EXECUTIVE_REVIEW_REQUIRED"


};


}


};


console.log(
"TSM Enterprise Intelligence Fusion Loaded"
);


})();
EOF



echo "CREATED:"
echo "$RUNTIME/intelligence-fusion-engine.js"



echo ""
echo "Creating Intelligence Context Registry..."


cat > "$DATA/intelligence-context.json" <<'EOF'
{

"engine":
"TSM Enterprise Intelligence Fusion",

"connectedLayers":

[

"Mission Engine",

"SAP Phase Intelligence",

"Process Map Engine",

"Digital Twin",

"Vertical Adapters",

"Sentinel",

"Executive Command Center"

],


"decisionFlow":

[

"Understand",

"Analyze",

"Decide",

"Execute",

"Explain"

],


"status":
"READY"

}
EOF


echo "CREATED:"
echo "$DATA/intelligence-context.json"



echo ""
echo "Creating Runtime Manifest..."


cat > "$RUNTIME/intelligence-fusion-manifest.json" <<'EOF'
{

"name":
"TSM Enterprise Intelligence Fusion",

"version":
"1.0",


"runtime":

[

"mission-engine.js",

"sap-phase-intelligence.js",

"process-map-engine.js",

"digital-twin-engine.js",

"sentinel-contract.js",

"executive-runtime.js"

]


}
EOF



echo ""
echo "Generating report..."


cat > "$REPORT" <<EOF
TSM Enterprise Intelligence Fusion Layer

STATUS:
READY


CONNECTED:

Mission Engine
SAP Phase Intelligence
Process Map Engine
Digital Twin
Vertical Adapters
Sentinel
Executive Command Center


ENTERPRISE REASONING FLOW:


Document Intake

        |

Mission Created

        |

SAP Phase Classification

        |

Digital Twin Impact

        |

War Room Activation

        |

Executive Decision

        |

Sentinel Evidence


EOF



echo ""
echo "=========================================="
echo "ENTERPRISE INTELLIGENCE FUSION READY"
echo ""
echo "Report:"
echo "$REPORT"
echo "=========================================="