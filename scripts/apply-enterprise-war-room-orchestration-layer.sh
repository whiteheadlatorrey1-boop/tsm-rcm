#!/bin/bash

set -e

echo "=========================================="
echo "TSM Enterprise War Room Orchestration Layer"
echo "=========================================="

BASE="html/shared/runtime/enterprise"

mkdir -p "$BASE"

echo ""
echo "Installing Mission Orchestrator..."

cat > "$BASE/mission-orchestrator.js" <<'EOF'
(function(){

window.TSMEnterpriseMissionOrchestrator = {

    createMission(payload){

        const mission = {

            id:
            "MISSION-" +
            Date.now(),

            vertical:
            payload.vertical || "general",

            source:
            payload.source || "document-intake",

            objective:
            payload.objective || "Analyze enterprise request",

            status:
            "CREATED",

            created:
            new Date().toISOString()

        };


        let queue =
        JSON.parse(
            localStorage.getItem(
                "tsm_mission_queue"
            ) || "[]"
        );


        queue.push(mission);


        localStorage.setItem(
            "tsm_mission_queue",
            JSON.stringify(queue)
        );


        window.dispatchEvent(
            new CustomEvent(
                "TSM_MISSION_CREATED",
                {
                    detail: mission
                }
            )
        );


        return mission;

    }

};


})();
EOF


echo "Installing War Room Router..."

cat > "$BASE/war-room-router.js" <<'EOF'
(function(){

window.TSMWarRoomRouter = {


resolve(vertical){

const routes = {

construction:
"html/war-rooms/construction/construction-war-room.html",

healthcare:
"html/war-rooms/healthcare/healthcare-war-room.html",

finops:
"html/war-rooms/finops/finops-war-room.html",

mortgage:
"html/war-rooms/mortgage/mortgage-war-room.html",

"real-estate":
"html/war-rooms/real-estate/real-estate-war-room.html",

legal:
"html/war-rooms/legal/legal-war-room.html",

insurance:
"html/war-rooms/insurance/insurance-war-room.html",

bpo:
"html/war-rooms/bpo/bpo-war-room.html",

schools:
"html/war-rooms/schools/schools-war-room.html"

};


return routes[vertical] ||
"html/tsm-doc-search-multi.html";


}


};


})();
EOF



echo "Installing Adapter Runtime Bridge..."

cat > "$BASE/adapter-runtime-bridge.js" <<'EOF'
(function(){

window.TSMAdapterBridge = {


activate(vertical,mission){


const adapter =
window.TSMAdapterRegistry?.get(
vertical
);


if(adapter){

return adapter.process(
mission
);

}


return {

status:"NO_ADAPTER",

vertical

};


}


};


})();
EOF



echo "Installing Sentinel Mission Contract..."

cat > "$BASE/sentinel-mission-monitor.js" <<'EOF'
(function(){


window.addEventListener(
"TSM_MISSION_CREATED",
(e)=>{


const mission=e.detail;


console.log(
"[SENTINEL]",
"Monitoring mission",
mission.id
);


mission.audit =
{

sentinel:
"ACTIVE",

timestamp:
new Date().toISOString()

};


}
);


})();
EOF



echo ""
echo "Registering runtime manifest..."


cat > "$BASE/orchestration-manifest.json" <<EOF
{
 "runtime":
 [
  "enterprise-runtime.js",
  "mission-engine.js",
  "mission-orchestrator.js",
  "war-room-router.js",
  "adapter-runtime-bridge.js",
  "sentinel-mission-monitor.js",
  "strategist-relay.js",
  "executive-relay.js",
  "digital-twin-sync.js"
 ],

 "flow":
 [
  "DOCUMENT_INTAKE",
  "MISSION_CREATION",
  "VERTICAL_ROUTING",
  "ADAPTER_ANALYSIS",
  "STRATEGIST_REASONING",
  "EXECUTIVE_DECISION",
  "SENTINEL_AUDIT"
 ]

}
EOF


mkdir -p reports


cat > reports/enterprise-war-room-orchestration-report.txt <<EOF
TSM Enterprise War Room Orchestration Layer

INSTALLED:

Mission Orchestrator
War Room Router
Adapter Runtime Bridge
Sentinel Mission Monitor

Architecture:

Universal Intake
        |
        v
Mission Queue
        |
        v
Enterprise Runtime
        |
        v
Vertical Adapter
        |
        v
Strategist
        |
        v
Executive Portal
        |
        v
Sentinel Governance

STATUS:
READY

EOF


echo ""
echo "=========================================="
echo "ENTERPRISE ORCHESTRATION READY"
echo ""
echo "Report:"
echo "reports/enterprise-war-room-orchestration-report.txt"
echo "=========================================="