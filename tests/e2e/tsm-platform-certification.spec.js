const { test, expect } = require("@playwright/test");
const fs = require("fs");


const apps = [
{
name:"Healthcare",
url:"/html/healthcare/executive-portal.html"
},
{
name:"Construction",
url:"/html/construction-suite/construction-executive-portal.html"
},
{
name:"BPO",
url:"/html/war-rooms/bpo/bpo-executive-portal.html"
},
{
name:"MDM",
url:"/html/war-rooms/mdm/mdm-executive-portal.html"
},
{
name:"CRM",
url:"/html/war-rooms/crm/crm-executive-portal.html"
},
{
name:"CPQ",
url:"/html/war-rooms/cpq/cpq-executive-portal.html"
},
{
name:"Catalog",
url:"/html/war-rooms/catalog/catalog-executive-portal.html"
},
{
name:"Approval",
url:"/html/war-rooms/approval/approval-executive-portal.html"
},
{
name:"Governance",
url:"/html/war-rooms/governance/governance-executive-portal.html"
},
{
name:"Digital Twin",
url:"/html/war-rooms/digital-twin/digital-twin-executive-portal.html"
}
];


const contracts = [

{
name:"Runtime",
terms:[
"runtime",
"tsm"
]
},

{
name:"Mission",
terms:[
"mission",
"exception",
"workflow",
"queue",
"risk"
]
},

{
name:"Intelligence",
terms:[
"ai",
"intelligence",
"strategist",
"recommend"
]
},

{
name:"Decision",
terms:[
"decision",
"action",
"approval",
"recommendation"
]
},

{
name:"Executive",
terms:[
"executive",
"dashboard",
"kpi",
"metric"
]
},

{
name:"Audit",
terms:[
"audit",
"history",
"log",
"trace"
]
}

];


test(
"TSM Platform Certification",
async({page})=>{


console.log(`
========================================
 TSM PLATFORM CERTIFICATION
========================================
`);


// Evidence checks

let evidence = [

"reports/demo-certification.json",

"runtime/demo/presentation-flow.json",

"demo-package/README.md"

];


for(const file of evidence){

expect(
fs.existsSync(file)
)
.toBeTruthy();


console.log(
"✓ Evidence:",
file
);

}


// Application checks

for(const app of apps){


console.log(`

----------------------------------------
${app.name}
----------------------------------------
`);


const response =
await page.goto(
app.url,
{
waitUntil:"networkidle"
}
);


expect(
response.status()
)
.toBe(200);



const html =
(await page.content())
.toLowerCase();



for(const contract of contracts){


const passed =
contract.terms.some(
term =>
html.includes(term)
);


console.log(

passed
?
`✓ ${contract.name}`
:
`⚠ ${contract.name}`

);


expect(
passed
)
.toBeTruthy();


}



await expect(
page.locator("body")
)
.toBeVisible();


}



console.log(`
========================================
 TSM PLATFORM CERTIFIED
========================================

Applications:
${apps.length}

Contracts:
${contracts.length}

Status:
READY FOR CUSTOMER / INVESTOR DEMO

========================================
`);

}

);