#!/usr/bin/env node

/**
 * TSM Phase 0 Presentation Flow Installer
 *
 * Creates a repeatable executive demo storyline:
 *
 * Intake
 *  ->
 * Mission Queue
 *  ->
 * War Room
 *  ->
 * Strategist
 *  ->
 * Executive Portal
 *  ->
 * Decision Surface
 *  ->
 * Audit Evidence
 */

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();


function write(file, data){

    const target =
        path.join(ROOT,file);

    fs.mkdirSync(
        path.dirname(target),
        {
            recursive:true
        }
    );

    fs.writeFileSync(
        target,
        JSON.stringify(data,null,2)
    );

    console.log("CREATED:",file);
}


console.log(`
=========================================
 TSM PRESENTATION FLOW INSTALLER
=========================================
`);


// --------------------------------------
// Master Presentation Flow
// --------------------------------------

const flow = {

name:"TSM Enterprise Decision Intelligence Demo",

version:"Phase 0",

sequence:[

{
step:1,
name:"Universal Intake",
page:
"/html/tsm-doc-search-multi.html",

action:
"Upload enterprise document"
},


{
step:2,
name:"Mission Creation",

event:
"MISSION_CREATED",

action:
"Create business exception mission"
},


{
step:3,
name:"War Room",

action:
"Analyze operational issue"
},


{
step:4,
name:"Strategist",

action:
"Generate recommendations and courses of action"
},


{
step:5,
name:"Executive Portal",

action:
"Present KPIs, risk, impact, decisions"
},


{
step:6,
name:"Decision Surface",

action:
"Approve recommended action"
},


{
step:7,
name:"Audit Evidence",

action:
"Capture decision history"
}

]

};


write(
"runtime/demo/presentation-flow.json",
flow
);


// --------------------------------------
// Demo Scenarios
// --------------------------------------

const scenarios = {


healthcare:{

industry:"Healthcare",

document:
"patient_claim_denial.pdf",

mission:
"High Value Claim Denial Review",

impact:
42000,

riskScore:
72,

warRoom:
"/html/healthcare/hc-denial-war-room.html",

strategist:
"/html/healthcare/hc-main-strategist.html",

executive:
"/html/healthcare/executive-portal.html",

decision:
"Appeal claim and correct coding workflow"

},



construction:{

industry:"Construction",

document:
"change_order_contract.pdf",

mission:
"Cost Overrun Risk Detection",

impact:
185000,

riskScore:
81,

warRoom:
"/html/construction-suite/construction-strategist.html",

strategist:
"/html/construction-suite/construction-strategist.html",

executive:
"/html/construction-suite/construction-executive-portal.html",

decision:
"Approve mitigation plan"

},



bpo:{

industry:"BPO",

document:
"processing_batch_return.zip",

mission:
"Quality Assurance Review",

impact:
5400,

riskScore:
25,

warRoom:
"/html/war-rooms/bpo/bpo-war-room.html",

strategist:
"/html/war-rooms/bpo/bpo-strategist.html",

executive:
"/html/war-rooms/bpo/bpo-executive-portal.html",

decision:
"Certify client delivery"

},



mdm:{

industry:"MDM",

document:
"supplier_master_export.csv",

mission:
"Duplicate Supplier Identity Resolution",

impact:
128,

riskScore:
64,

warRoom:
"/html/war-rooms/mdm/mdm-war-room.html",

strategist:
"/html/war-rooms/mdm/mdm-strategist.html",

executive:
"/html/war-rooms/mdm/mdm-executive-portal.html",

decision:
"Merge duplicate identities"

}

};


write(
"runtime/demo/demo-scenarios.json",
scenarios
);


// --------------------------------------
// Screenshot Capture Plan
// --------------------------------------

const screenshots = {

captureOrder:[

{
name:"01-intake",
page:
"tsm-doc-search-multi.html"
},

{
name:"02-mission-queue",
page:
"mission-queue"
},

{
name:"03-war-room",
page:
"war-room"
},

{
name:"04-strategist",
page:
"strategist"
},

{
name:"05-executive",
page:
"executive-portal"
},

{
name:"06-decision",
page:
"decision-surface"
},

{
name:"07-audit",
page:
"audit-evidence"
}

]

};


write(
"runtime/demo/screenshot-plan.json",
screenshots
);


// --------------------------------------
// Demo Certification Report
// --------------------------------------

write(
"reports/presentation-flow-install-report.json",
{

status:"READY",

components:[

"Presentation Flow",

"Demo Scenarios",

"Screenshot Plan"

],

scenarios:
Object.keys(scenarios),

created:
new Date().toISOString()

}

);


console.log(`
=========================================

PRESENTATION FLOW READY

Scenarios:
${Object.keys(scenarios).join(", ")}

Next:
npx playwright test

=========================================
`);

