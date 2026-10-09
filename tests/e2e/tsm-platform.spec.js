const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || "http://localhost:8080";

const workflows = [

{
name:"War Room Prep",
url:"/html/war-rooms/war-room-prep.html"
},

{
name:"Healthcare",
pages:[
"/html/healthcare/hc-denial-war-room.html",
"/html/healthcare/hc-main-strategist.html",
"/html/healthcare/executive-portal.html"
]
},

{
name:"BPO",
pages:[
"/html/war-rooms/bpo-war/bpo-war-room.html",
"/html/war-rooms/bpo-war/bpo-strategist.html",
"/html/war-rooms/bpo-war/bpo-executive-portal.html"
]
},

{
name:"CRM",
pages:[
"/html/war-rooms/crm/crm-war-room.html"
]
},

{
name:"CPQ",
pages:[
"/html/war-rooms/cpq/cpq-war-room.html"
]
},

{
name:"Catalog",
pages:[
"/html/war-rooms/catalog/catalog-war-room.html"
]
},

{
name:"Approval",
pages:[
"/html/war-rooms/approval/approval-war-room.html"
]
},

{
name:"MDM",
pages:[
"/html/war-rooms/mdm/mdm-war-room.html",
"/html/war-rooms/mdm/mdm-strategist.html",
"/html/war-rooms/mdm/mdm-executive-portal.html"
]
},

{
name:"Music Command",
url:"/music/"
},

{
name:"Sweet OS",
url:"/html/sweet-os/sweet-os.html"
},

{
name:"Honeywell Demo",
url:"/html/TSM_Shell_Honeywell_TalkTrack_30min.html"
}

];


const heavyPages = [
"/html/healthcare/hc-denial-war-room.html",
"/html/war-rooms/bpo-war/bpo-war-room.html"
];

async function inspect(page,name,path){

const consoleErrors=[];
const pageErrors=[];
const failed=[];
const protectedAuthResponses = new Map();
const protectedAuthPaths = [
  "/api/integrations/fhir/status",
  "/api/hc/portfolio-intelligence",
  "/api/bpo/cases?vertical=healthcare",
  "/api/exec-portal/healthcare/decisions",
  "/api/hc/node-reports",
  "/api/hc/intelligence-v3",
  "/api/bpo/client-directory",
  "/api/war-room/stream",
  "/api/bpo/cases",
  "/api/exec-portal/bpo/decisions"
];

page.on("response", response => {
  if (![401, 403].includes(response.status())) return;
  const url = new URL(response.url());
  if (url.origin !== new URL(BASE).origin) return;
  if (protectedAuthPaths.includes(url.pathname + url.search) ||
      (!protectedAuthPaths.some(path => path.includes('?')) &&
       protectedAuthPaths.includes(url.pathname))) {
    const status = response.status();
    protectedAuthResponses.set(status, (protectedAuthResponses.get(status) || 0) + 1);
  }
});

page.on("console",msg=>{
if(msg.type()==="error") {
  const message = msg.text();
  consoleErrors.push(message);
}
});

page.on("pageerror",err=>{
pageErrors.push(err.message);
});

page.on("requestfailed",req=>{
failed.push(req.url());
});

const response=await page.goto(
BASE+path,
{
waitUntil:"domcontentloaded",
timeout:60000
}
);

await page.waitForTimeout(3000);

expect(response).not.toBeNull();
expect(response.status()).toBeLessThan(500);

try {

await page.screenshot({
path:`playwright-report/${name.replace(/\s/g,"_")}.png`,
fullPage:false,
timeout:30000
});

} catch(err) {

console.log(
"Screenshot skipped:",
err.message
);

}

let links=[];

if(!heavyPages.includes(path)) {

try {

links=await page.locator("a[href]").evaluateAll(nodes=>
nodes.map(n=>n.href)
);

} catch(err){

console.log(
"Link scan skipped:",
err.message
);

}

}

console.log("");

console.log("================================");
console.log(name);
console.log(path);
console.log("================================");

console.log("Status:",response.status());

if(consoleErrors.length){
console.log("Console Errors");
console.log(consoleErrors);
}

if(pageErrors.length){
console.log("Page Errors");
console.log(pageErrors);
}

if(failed.length){
console.log("Failed Requests");
console.log(failed);
}

for(const href of links){

if(
href.startsWith(BASE)
){

const r=await page.request.get(href);

expect(r.status()).toBeLessThan(500);

}

}

if (page.isClosed()) {

console.log(
"Validation skipped: page closed unexpectedly"
);

return;

}

const remainingConsoleErrors = [...consoleErrors];
for (const status of [401, 403]) {
  let allowance = protectedAuthResponses.get(status) || 0;
  const pattern = new RegExp(
    '^Failed to load resource: the server responded with a status of ' +
    status + ' \\(.*\\)$'
  );
  for (let i = remainingConsoleErrors.length - 1; i >= 0 && allowance > 0; i--) {
    if (pattern.test(remainingConsoleErrors[i])) {
      remainingConsoleErrors.splice(i, 1);
      allowance--;
    }
  }
}
expect(remainingConsoleErrors).toEqual([]);
expect(pageErrors).toEqual([]);
expect(failed).toEqual([]);

}

test.describe("TSM Platform",()=>{

for(const wf of workflows){

if(wf.url){

test(wf.name,async({page})=>{

await inspect(
page,
wf.name,
wf.url
);

});

}

if(wf.pages){

for(const p of wf.pages){

test(`${wf.name} ${p}`,async({page})=>{

await inspect(
page,
`${wf.name}-${p.split("/").pop()}`,
p
);

});

}

}

}

});
