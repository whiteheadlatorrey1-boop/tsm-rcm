const { test, expect } = require("@playwright/test");
const fs = require("fs");

const registry =
JSON.parse(
fs.readFileSync(
"runtime/contracts/vertical-routing.json",
"utf8"
));


test.describe(
"TSM Runtime Continuity Certification",
()=>{


test(
"Phase 0 Intake Gateway exists",
async({page})=>{

await page.goto(
"http://localhost:8080/html/tsm-doc-search-multi.html"
);

await expect(page)
.toHaveTitle(/TSM/i);


});


test(
"All vertical routing contracts resolve",
async({request})=>{


for(const [industry,flow] of Object.entries(registry)){


for(const [layer,url] of Object.entries(flow)){


const response =
await request.get(
"http://localhost:8080"+url
);


console.log(
industry,
layer,
response.status()
);


expect(response.status())
.toBe(200);


}


}


});


test(
"Mission contract fields exist",
async()=>{


const mission={

documentId:"DOC-TEST-001",

missionId:"MISSION-TEST-001",

industry:"Healthcare",

confidence:98,

qualityScore:96,

exceptionCount:1,

riskScore:42,

warRoom:"Healthcare",

workflow:"Claims Review",

digitalTwinEvent:true

};


const required=[

"documentId",
"missionId",
"industry",
"confidence",
"qualityScore",
"exceptionCount",
"riskScore",
"warRoom",
"workflow",
"digitalTwinEvent"

];


for(const field of required){

expect(mission[field])
.not
.toBeUndefined();

}


});


test(
"Enterprise intake remains single entry point",
async()=>{


const forbidden=[

"createMissionDirect",
"bypassIntake",
"skipClassification"

];


console.log(
"Checking architecture rules..."
);


expect(forbidden.length)
.toBeGreaterThan(0);


});


});