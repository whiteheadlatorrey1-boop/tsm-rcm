#!/usr/bin/env node

/**
 * TSM Phase 0 Runtime Demo Data Installer
 *
 * Purpose:
 * Populate executive portals and war rooms
 * with deterministic presentation data.
 */

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();


function write(file,data){

    const target =
        path.join(ROOT,file);

    fs.mkdirSync(
        path.dirname(target),
        {recursive:true}
    );

    fs.writeFileSync(
        target,
        JSON.stringify(data,null,2)
    );

    console.log("CREATED:",file);
}


console.log(`
=========================================
 TSM PHASE 0 DEMO DATA INSTALLER
=========================================
`);


// -----------------------------------------
// Correct Phase 0 Routing
// -----------------------------------------

const routes = {

healthcare:{
warRoom:
"html/healthcare/hc-main-strategist.html",

strategist:
"html/healthcare/hc-main-strategist.html",

executive:
"html/healthcare/executive-portal.html"
},


construction:{
warRoom:
"html/construction-suite/construction-strategist.html",

strategist:
"html/construction-suite/construction-strategist.html",

executive:
"html/construction-suite/construction-executive-portal.html"
},


bpo:{
warRoom:
"html/war-rooms/bpo/bpo-strategist.html",

strategist:
"html/war-rooms/bpo/bpo-strategist.html",

executive:
"html/war-rooms/bpo/bpo-executive-portal.html"
},


insurance:{
warRoom:
"html/tsm-insurance/insurance-strategist.html",

strategist:
"html/tsm-insurance/insurance-strategist.html",

executive:
"html/tsm-insurance/insurance-executive-portal.html"
},


finops:{
warRoom:
"html/finops-suite/finops-main-strategist.html",

strategist:
"html/finops-suite/finops-main-strategist.html",

executive:
"html/finops-suite/finops-executive-portal.html"
},


legal:{
warRoom:
"html/legal-pro/legal-main-strategist.html",

strategist:
"html/legal-pro/legal-main-strategist.html",

executive:
"html/legal-pro/legal-executive-portal.html"
},


mdm:{
warRoom:
"html/war-rooms/mdm/mdm-strategist.html",

strategist:
"html/war-rooms/mdm/mdm-strategist.html",

executive:
"html/war-rooms/mdm/mdm-executive-portal.html"
}

};


write(
"runtime/phase0/war-room-map.json",
routes
);


// -----------------------------------------
// Demo Intelligence
// -----------------------------------------

const demo = {


healthcare:{

industry:"healthcare",

kpis:{
qualityScore:96,
documentsProcessed:12480,
cleanClaimScore:94,
automationRate:"87%"
},

missions:[
{
id:"HC-DENIAL-001",
title:"High Value Claim Denial Review",
payer:"BlueCross BlueShield",
issue:"CPT 99215 coding anomaly",
exposure:42000,
riskScore:72,
status:"OPEN"
}
],

recommendations:[
"Review coding variance pattern",
"Prioritize payer appeal workflow",
"Update billing policy rules"
]

},



construction:{

industry:"construction",

kpis:{
projectsMonitored:42,
documentAccuracy:97,
scheduleRisk:"LOW",
costVariance:"3.2%"
},

missions:[
{
id:"CONST-001",
title:"Contract Change Order Risk",
project:"Downtown Medical Expansion",
exposure:185000,
riskScore:81,
status:"ACTIVE"
}
]

},



bpo:{

industry:"bpo",

kpis:{
accuracy:"98.7%",
slaCompliance:"99%",
automationRate:"87%"
},

missions:[
{
id:"BPO-001",
title:"Healthcare Document Processing Batch",
documents:5400,
qualityScore:98,
status:"DELIVERED"
}
]

},



insurance:{

industry:"insurance",

kpis:{
claimsReviewed:8200,
fraudDetection:91,
qualityScore:95
},

missions:[
{
id:"INS-001",
title:"Claims Risk Assessment",
riskScore:68,
status:"OPEN"
}
]

},



finops:{

industry:"finops",

kpis:{
invoiceAccuracy:97,
savingsIdentified:250000,
exceptions:14
},

missions:[
{
id:"FIN-001",
title:"Vendor Spend Optimization",
impact:250000,
status:"OPEN"
}
]

},



legal:{

industry:"legal",

kpis:{
casesReviewed:620,
documentAccuracy:98
},

missions:[
{
id:"LEGAL-001",
title:"Contract Exposure Review",
riskScore:63,
status:"ACTIVE"
}
]

},



mdm:{

industry:"mdm",

kpis:{
healthScore:94,
duplicatesDetected:128,
recordsNormalized:54000
},

missions:[
{
id:"MDM-001",
title:"Duplicate Supplier Identity Resolution",
status:"OPEN"
}
]

}

};



Object.entries(demo)
.forEach(([industry,data])=>{

write(
`runtime/demo/${industry}-demo.json`,
data
);

});



// -----------------------------------------
// Mission Queue Seed
// -----------------------------------------

const queue = [];


Object.values(demo)
.forEach(item=>{

item.missions.forEach(mission=>{

queue.push({

...mission,

industry:item.industry,

created:
new Date().toISOString()

});

});

});


write(
"runtime/demo/tsm-mission-queue.json",
queue
);


// -----------------------------------------
// Report
// -----------------------------------------

write(
"reports/phase0-demo-data-install-report.json",
{

status:"READY",

industries:
Object.keys(demo),

missionCount:
queue.length,

timestamp:
new Date().toISOString()

}

);


console.log(`
=========================================
 DEMO DATA INSTALL COMPLETE

Mission Queue:
${queue.length} missions

Ready for:
- War Rooms
- Strategists
- Executive Portals

=========================================
`);
