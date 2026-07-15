#!/usr/bin/env node

/**
 * TSM Phase 0 Demo Stack Installer
 *
 * Purpose:
 * Build a presentation-ready document intake pipeline:
 *
 * Upload
 *  |
 * OCR
 *  |
 * Classification
 *  |
 * Industry Detection
 *  |
 * Mission Queue
 *  |
 * War Room
 *  |
 * Strategist
 *  |
 * Executive Portal
 *
 */

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const write = (file, content) => {

    const target = path.join(ROOT, file);

    fs.mkdirSync(path.dirname(target), {
        recursive:true
    });

    fs.writeFileSync(
        target,
        content
    );

    console.log("CREATED:", file);
};


const exists = (file)=>fs.existsSync(
    path.join(ROOT,file)
);



console.log(`
=========================================
 TSM PHASE 0 DEMO STACK INSTALLER
=========================================
`);


// --------------------------------------------------
// 1. Validate Intake
// --------------------------------------------------

const intake =
"html/tsm-doc-search-multi.html";


if(!exists(intake)){

    console.error(`
ERROR:
Universal intake missing:

${intake}

Create this file before continuing.
`);

    process.exit(1);
}


console.log(
"✓ Universal intake detected"
);



// --------------------------------------------------
// 2. Intake Configuration
// --------------------------------------------------

write(
"runtime/phase0/intake-config.json",

JSON.stringify({

    entryPoint:intake,

    pipeline:[
        "UPLOAD",
        "OCR",
        "CLASSIFICATION",
        "INDUSTRY_DETECTION",
        "MISSION_CREATED",
        "WAR_ROOM_ROUTING",
        "EXECUTIVE_DECISION"
    ],

    event:
    "MISSION_CREATED"

},null,2)

);



// --------------------------------------------------
// 3. War Room Routing Map
// --------------------------------------------------

write(
"runtime/phase0/war-room-map.json",

JSON.stringify({

healthcare:{
warRoom:
"html/war-rooms/healthcare/hc-denial-war-room.html",

strategist:
"html/healthcare/hc-main-strategist.html",

executive:
"html/healthcare/executive-portal.html"
},


construction:{
warRoom:
"html/war-rooms/construction/construction-war-room.html",

strategist:
"html/construction/construction-strategist.html",

executive:
"html/construction/executive-portal.html"
},


legal:{
warRoom:
"html/war-rooms/legal/legal-war-room.html",

strategist:
"html/legal/legal-strategist.html",

executive:
"html/legal/executive-portal.html"
},


insurance:{
warRoom:
"html/war-rooms/insurance/insurance-war-room.html",

strategist:
"html/insurance/strategist.html",

executive:
"html/insurance/executive-portal.html"
},


realestate:{
warRoom:
"html/war-rooms/real-estate/real-estate-war-room.html",

strategist:
"html/real-estate/strategist.html",

executive:
"html/real-estate/executive-portal.html"
},


finops:{
warRoom:
"html/war-rooms/finops/finops-war-room.html",

strategist:
"html/finops/strategist.html",

executive:
"html/finops/executive-portal.html"
},


bpo:{
warRoom:
"html/war-rooms/bpo/bpo-war-room.html",

strategist:
"html/bpo/strategist.html",

executive:
"html/bpo/executive-portal.html"
}

},null,2)

);



// --------------------------------------------------
// 4. Event Bridge
// --------------------------------------------------

write(
"runtime/phase0/intake-event-bridge.js",

`

window.TSM_PHASE0 = {

createMission(payload){

const mission = {

id:
"TSM-DEMO-"+Date.now(),

industry:
payload.industry || "general",

document:
payload.document || "uploaded-document",

status:
"QUEUED",

created:
new Date().toISOString()

};


window.dispatchEvent(

new CustomEvent(
"MISSION_CREATED",
{
detail:mission
})

);


return mission;

}

};

`

);



// --------------------------------------------------
// 5. Router
// --------------------------------------------------

write(
"runtime/phase0/war-room-router.js",

`

function routeMission(industry){

const routes =
require("./war-room-map.json");


return routes[industry]
||
{

warRoom:
"html/war-rooms/general-war-room.html"

};

}


module.exports={
routeMission
};

`

);



// --------------------------------------------------
// 6. Presentation Flow
// --------------------------------------------------

write(
"runtime/phase0/presentation-flow.json",

JSON.stringify({

flow:[

"INTAKE",

"MISSION_QUEUE",

"WAR_ROOM",

"STRATEGIST",

"EXECUTIVE_PORTAL",

"DIGITAL_TWIN",

"DECISION_SURFACE",

"AUDIT"

]

},null,2)

);



// --------------------------------------------------
// 7. Playwright Smoke Test Scaffold
// --------------------------------------------------

write(
"tests/playwright/phase0-enterprise-smoke.spec.js",

`

const {test,expect}=require("@playwright/test");


test(
"TSM Phase 0 Demo Flow",

async({page})=>{


await page.goto(
"http://localhost:8080/html/tsm-doc-search-multi.html"
);


await expect(
page
).toHaveTitle(/TSM/i);


await page.screenshot({

path:
"reports/screenshots/phase0-intake.png"

});


});

`

);



// --------------------------------------------------
// 8. Presentation Audit
// --------------------------------------------------

write(
"scripts/phase0/presentation-polish.js",

`

const fs=require("fs");


console.log(
"TSM Presentation Audit"
);


const htmlFiles=[];


function scan(dir){

if(!fs.existsSync(dir))
return;


for(const file of fs.readdirSync(dir)){

const p=
dir+"/"+file;


if(fs.statSync(p).isDirectory())
scan(p);


if(file.endsWith(".html"))
htmlFiles.push(p);

}

}


scan("html");


console.log(
"HTML FILES:",
htmlFiles.length
);


`

);



// --------------------------------------------------
// 9. Install Report
// --------------------------------------------------

write(
"reports/phase0-install-report.json",

JSON.stringify({

phase:"0",

status:"READY",

components:[

"Universal Intake",

"Mission Event Bridge",

"War Room Router",

"Presentation Flow",

"Playwright Smoke",

"Presentation Audit"

],

timestamp:
new Date().toISOString()


},null,2)

);



console.log(`
=========================================
 PHASE 0 INSTALL COMPLETE

NEXT:
1. Start server
2. Open:
   html/tsm-doc-search-multi.html

3. Run:
   npx playwright test tests/playwright/phase0-enterprise-smoke.spec.js

=========================================
`);
