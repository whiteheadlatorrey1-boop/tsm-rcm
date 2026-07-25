#!/usr/bin/env bash
set -e

echo "🚀 Installing Enterprise Intelligence Portal Wire"

CLIENT="html/js/enterprise-intelligence.js"

mkdir -p html/js


cat > "$CLIENT" <<'JS'
// TSM Enterprise Intelligence Client

window.TSMEnterprise = {

async request(endpoint,payload={}){

    const response = await fetch(
        `/api/enterprise/${endpoint}`,
        {
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify(payload)
        }
    );

    return await response.json();

},


loadDashboard(context){
    return this.request("dashboard",context);
},


loadDecision(context){
    return this.request("decision",context);
},


loadMissions(context){
    return this.request("missions",context);
},


saveMissionQueue(missions){

    localStorage.setItem(
        "tsm_mission_queue",
        JSON.stringify(missions || [])
    );

},


getMissionQueue(){

    return JSON.parse(
        localStorage.getItem("tsm_mission_queue") || "[]"
    );

}

};
JS


echo "✅ Client created: $CLIENT"



PORTAL=""

if [ -f "html/executive-portal-v2.html" ]; then
    PORTAL="html/executive-portal-v2.html"
elif [ -f "html/healthcare/executive-portal.html" ]; then
    PORTAL="html/healthcare/executive-portal.html"
else
    echo "❌ No executive portal found"
    exit 1
fi


echo "🎯 Target portal: $PORTAL"


cp "$PORTAL" "$PORTAL.backup.$(date +%Y%m%d-%H%M%S)"


node <<NODE

const fs=require("fs");

const file="$PORTAL";

let html=fs.readFileSync(file,"utf8");


if(!html.includes("enterprise-intelligence.js")){

    html = html.replace(
        /<\/body>/i,
        \`
<script src="/js/enterprise-intelligence.js"></script>

<script>

async function initializeEnterprisePortal(){

const context={

vertical:"healthcare",

entity:"Banner Health",

customer:{
 id:"BAN-001"
},

audit:{
 id:"AUDIT-2026-001"
}

};


const dashboard =
 await TSMEnterprise.loadDashboard(context);


const decision =
 await TSMEnterprise.loadDecision(context);


const missions =
 await TSMEnterprise.loadMissions(context);


TSMEnterprise.saveMissionQueue(
 missions.missions
);


console.log(
 "ENTERPRISE DASHBOARD",
 dashboard
);


console.log(
 "EXECUTIVE DECISION",
 decision
);


console.log(
 "MISSION QUEUE",
 missions
);


}


initializeEnterprisePortal();

</script>
\`
        + "</body>"
    );

}


fs.writeFileSync(file,html);

console.log("✅ Portal wired");

NODE


echo ""
echo "🧪 Checking..."

grep -n "enterprise-intelligence" "$PORTAL"


echo ""
echo "✅ Enterprise Executive Portal wiring complete"

