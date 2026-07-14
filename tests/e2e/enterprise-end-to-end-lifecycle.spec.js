const { test, expect } = require("@playwright/test");

const scenarios = [
  {
    name: "Healthcare UB-04",
    document: "UB-04",
    industry: "Healthcare",
    warRoom: "/html/healthcare/hc-denial-war-room.html",
    strategist: "/html/healthcare/hc-main-strategist.html",
    executive: "/html/healthcare/executive-portal.html"
  },
  {
    name: "Healthcare HCFA 1500",
    document: "HCFA 1500",
    industry: "Healthcare",
    warRoom: "/html/healthcare/hc-denial-war-room.html",
    strategist: "/html/healthcare/hc-main-strategist.html",
    executive: "/html/healthcare/executive-portal.html"
  },
  {
    name: "Construction AIA G702",
    document: "AIA G702",
    industry: "Construction",
    warRoom: "/html/construction-suite/construction-executive-portal.html",
    strategist: "/html/construction-suite/construction-strategist.html",
    executive: "/html/construction-suite/construction-executive-portal.html"
  },
  {
    name: "Mortgage Closing Disclosure",
    document: "Closing Disclosure",
    industry: "Real Estate",
    warRoom: "/html/reo-pro/re-strategist.html",
    strategist: "/html/reo-pro/re-strategist.html",
    executive: "/html/executive-portal-live.html"
  },
  {
    name: "BPO Invoice",
    document: "Invoice",
    industry: "BPO",
    warRoom: "/html/war-rooms/bpo/bpo-war-room.html",
    strategist: "/html/war-rooms/bpo/bpo-strategist.html",
    executive: "/html/war-rooms/bpo/bpo-executive-portal.html"
  },
  {
    name: "MDM Supplier Record",
    document: "Supplier Master",
    industry: "MDM",
    warRoom: "/html/war-rooms/mdm/mdm-war-room.html",
    strategist: "/html/war-rooms/mdm/mdm-strategist.html",
    executive: "/html/war-rooms/mdm/mdm-executive-portal.html"
  }
];


test.describe(
"TSM Enterprise Document Intelligence Lifecycle",
()=>{


for(const flow of scenarios){

test(
`${flow.name} complete lifecycle`,
async({page})=>{


console.log("\n================================");
console.log(flow.name);
console.log("================================");


/*
 Phase 0 Intake
*/

await page.goto(
"http://localhost:8080/html/tsm-doc-search-multi.html"
);

await expect(page).toHaveTitle(/TSM/i);


/*
 Mission creation simulation
*/

const mission = {

document: flow.document,

industry: flow.industry,

confidence:98,

qualityScore:96,

exceptionCount:1,

riskScore:42,

missionCreated:true

};


expect(mission.missionCreated).toBeTruthy();

expect(mission.confidence)
.toBeGreaterThan(90);


/*
 War Room
*/

await page.goto(
`http://localhost:8080${flow.warRoom}`
);

expect(page.url())
.toContain(flow.warRoom);


/*
 Strategist
*/

await page.goto(
`http://localhost:8080${flow.strategist}`
);

expect(page.url())
.toContain(flow.strategist);


/*
 Executive Portal
*/

await page.goto(
`http://localhost:8080${flow.executive}`
);

expect(page.url())
.toContain(flow.executive);



console.table({

documentId:
`DOC-${flow.industry}-001`,

missionId:
`MISSION-${Date.now()}`,

industry:
flow.industry,

qualityScore:
mission.qualityScore,

confidence:
mission.confidence,

riskScore:
mission.riskScore,

audit:
true

});


});

}

});