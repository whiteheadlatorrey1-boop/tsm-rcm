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
"/html/war-rooms/bpo/bpo-war-room.html",
"/html/war-rooms/html/war-rooms/bpo/bpo-strategist.html",
"/html/war-rooms/bpo/bpo-executive-portal.html"
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
url:"/html/music-command/index.html"
},

{
name:"Honeywell Demo",
url:"/html/TSM_Shell_Honeywell_TalkTrack_30min.html"
}

];

async function inspect(page,name,path){

const consoleErrors=[];
const pageErrors=[];
const failed=[];

page.on("console",msg=>{
if(msg.type()==="error")
consoleErrors.push(msg.text());
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
waitUntil:"networkidle",
timeout:60000
}
);

expect(response).not.toBeNull();
expect(response.status()).toBeLessThan(500);

await page.screenshot({
path:`playwright-report/${name.replace(/\s/g,"_")}.png`,
fullPage:true
});

const links=await page.locator("a[href]").evaluateAll(nodes=>
nodes.map(n=>n.href)
);

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

expect(consoleErrors).toEqual([]);
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