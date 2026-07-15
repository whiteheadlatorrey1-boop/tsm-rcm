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

