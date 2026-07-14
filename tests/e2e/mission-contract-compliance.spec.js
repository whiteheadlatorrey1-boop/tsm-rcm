const { test, expect } = require("@playwright/test");


const applications = [

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
name:"Runtime Layer",
patterns:[
"runtime",
"tsm",
"event"
]
},

{
name:"Mission Object",
patterns:[
"mission",
"issue",
"exception",
"risk",
"workflow",
"queue"
]
},

{
name:"Intelligence Layer",
patterns:[
"ai",
"intelligence",
"strategist",
"recommend"
]
},

{
name:"Decision Layer",
patterns:[
"decision",
"action",
"approve",
"recommendation"
]
},

{
name:"Executive Layer",
patterns:[
"executive",
"dashboard",
"kpi",
"metric"
]
},

{
name:"Audit Layer",
patterns:[
"audit",
"history",
"log",
"trace",
"record"
]
}

];


for(const app of applications){


test(
`${app.name} Mission Contract`,
async({page})=>{


console.log(`
=====================================
${app.name}
Mission Contract Audit
=====================================
`);


const response =
await page.goto(
app.url,
{
waitUntil:"networkidle"
}
);


expect(response.status())
.toBe(200);



const content =
(await page.content())
.toLowerCase();



let report=[];



for(const contract of contracts){


const found =
contract.patterns.some(
pattern =>
content.includes(pattern)
);



report.push({

contract:
contract.name,

status:
found ? "PASS":"WARN"

});


}



console.table(report);



await page.screenshot({

path:
`reports/mission-contract/${app.name.replaceAll(" ","-")}.png`,

fullPage:true

});



const missing =
report.filter(
x=>x.status==="WARN"
);



if(missing.length){


console.warn(
`
${app.name}
needs mission contract enrichment:
`,
missing
);


}


await expect(
page.locator("body")
)
.toBeVisible();


}

);


}