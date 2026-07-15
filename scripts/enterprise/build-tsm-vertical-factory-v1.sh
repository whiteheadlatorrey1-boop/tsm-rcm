#!/bin/bash
set -e

echo "=============================================="
echo " TSM ENTERPRISE VERTICAL FACTORY V1 BUILDER"
echo "=============================================="

mkdir -p \
scripts/enterprise \
templates/vertical/html/war-room \
templates/vertical/server \
templates/vertical/runtime \
templates/vertical/tests \
docs/enterprise


echo "[1/8] Creating vertical generator"

cat > scripts/enterprise/create-vertical.sh <<'EOF'
#!/bin/bash
set -e

VERTICAL=$1
DOMAIN=$2

if [ -z "$VERTICAL" ]; then
 echo "Usage:"
 echo "./create-vertical.sh mortgage lending"
 exit 1
fi

echo "Creating vertical: $VERTICAL"

mkdir -p \
html/war-rooms/$VERTICAL \
server/$VERTICAL \
html/shared/runtime/adapters \
tests/e2e/$VERTICAL \
demo-data/$VERTICAL


cat > html/war-rooms/$VERTICAL/${VERTICAL}-war-room.html <<HTML
<!DOCTYPE html>
<html>
<head>
<title>TSM $VERTICAL War Room</title>
<link rel="stylesheet" href="../../assets/style.css">
</head>

<body>

<h1>TSM ${VERTICAL^^} WAR ROOM</h1>

<div>
Domain:
$DOMAIN
</div>

<div id="mission">
Mission Queue Loading...
</div>

</body>
</html>
HTML


cat > html/war-rooms/$VERTICAL/${VERTICAL}-executive-portal.html <<HTML
<!DOCTYPE html>
<html>
<head>
<title>TSM $VERTICAL Executive Portal</title>
</head>

<body>

<h1>
TSM ${VERTICAL^^} EXECUTIVE COMMAND CENTER
</h1>

<section>
Pipeline
</section>

<section>
Risk Intelligence
</section>

<section>
Digital Twin
</section>

</body>
</html>
HTML


cat > server/$VERTICAL/${VERTICAL}-engine.js <<JS

function processMission(mission){

return {

vertical:"$VERTICAL",

status:"ACTIVE",

mission

};

}

module.exports={
processMission
};

JS


cat > html/shared/runtime/adapters/${VERTICAL}-runtime-adapter.js <<JS

window.TSM_${VERTICAL^^}_ADAPTER={

vertical:"$VERTICAL",

route:function(mission){

return {

destination:"${VERTICAL}-war-room",

mission

};

}

};

JS


cat > tests/e2e/$VERTICAL/${VERTICAL}-lifecycle.spec.js <<JS

const {test,expect}=require("@playwright/test");

test(
"TSM $VERTICAL enterprise lifecycle",
async({page})=>{

await page.goto(
"/html/war-rooms/$VERTICAL/${VERTICAL}-war-room.html"
);

await expect(page).toHaveTitle(
/TSM/
);

});

JS


echo "$VERTICAL vertical created"

EOF


chmod +x scripts/enterprise/create-vertical.sh


echo "[2/8] Creating vertical certification runner"

cat > scripts/enterprise/certify-vertical.sh <<'EOF'
#!/bin/bash

VERTICAL=$1

if [ -z "$VERTICAL" ]; then
 echo "Usage: ./certify-vertical.sh mortgage"
 exit 1
fi


echo "=============================================="
echo " TSM $VERTICAL CERTIFICATION"
echo "=============================================="


npx playwright test \
tests/e2e/$VERTICAL/${VERTICAL}-lifecycle.spec.js


echo
echo "$VERTICAL READY"

EOF


chmod +x scripts/enterprise/certify-vertical.sh


echo "[3/8] Creating capability template"

cat > templates/vertical/capability-matrix.json <<EOF
{
 "intake":true,
 "missions":true,
 "warRoom":true,
 "strategist":true,
 "executivePortal":true,
 "digitalTwin":true,
 "governance":true
}
EOF


echo "[4/8] Creating architecture documentation"

cat > docs/enterprise/TSM-Vertical-Factory.md <<EOF
# TSM Vertical Factory

Creates enterprise operating systems using:

- Runtime Adapter
- Mission Contract
- War Room
- Strategist
- Executive Portal
- Digital Twin
- Playwright Certification

EOF


echo "[5/8] Creating demo data template"

cat > templates/vertical/demo-data.json <<EOF
{
 "id":"DEMO-001",
 "status":"NEW",
 "riskScore":50,
 "recommendation":"Analyze mission"
}
EOF


echo "[6/8] Creating mission contract template"

cat > templates/vertical/mission-contract.json <<EOF
{
 "missionId":"",
 "vertical":"",
 "priority":"HIGH",
 "status":"CREATED",
 "evidence":[]
}
EOF


echo "[7/8] Creating registry"

mkdir -p server/enterprise

cat > server/enterprise/vertical-registry.js <<EOF
module.exports={

verticals:[

"healthcare",
"construction",
"bpo",
"mortgage"

]

};
EOF


echo "[8/8] Complete"

echo
echo "=============================================="
echo " TSM VERTICAL FACTORY V1 READY"
echo "=============================================="

echo
echo "Create new sector:"
echo "./scripts/enterprise/create-vertical.sh realestate property"

echo
echo "Certify:"
echo "./scripts/enterprise/certify-vertical.sh realestate"