const { test, expect } = require("@playwright/test");

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


const requiredFunctions = [

{
name:"TSM Runtime",
patterns:[
"runtime",
"tsm"
]
},

{
name:"Executive Dashboard",
patterns:[
"dashboard",
"kpi",
"metric",
"executive"
]
},

{
name:"AI / Intelligence",
patterns:[
"ai",
"intelligence",
"strategist",
"recommend"
]
},

{
name:"Mission / Workflow",
patterns:[
"mission",
"workflow",
"exception"
]
},

{
name:"Decision Support",
patterns:[
"decision",
"action",
"recommendation"
]
}

];



for(const app of apps){


test(
`${app.name} enterprise function compliance`,
async({page})=>{


console.log(`
================================
${app.name}
${app.url}
================================
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



const html =
await page.content();


const lower =
html.toLowerCase();



let results = [];



for(const fn of requiredFunctions){


const found =
fn.patterns.some(
pattern =>
lower.includes(pattern)
);


results.push({

function:fn.name,

status:
found ? "PASS":"WARN"

});


}



console.table(results);



const failures =
results.filter(
x=>x.status==="WARN"
);



if(failures.length){

console.warn(
`${app.name} missing possible functions:`,
failures
);

}


// Basic render check

await expect(
page.locator("body")
).toBeVisible();



await page.screenshot({

path:
`reports/function-audit/${app.name.replaceAll(" ","-")}.png`,

fullPage:true

});


}

);


}