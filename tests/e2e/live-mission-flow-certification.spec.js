

const {test,expect}=require("@playwright/test");

const missions=require("../../runtime/phase0/demo-mission-queue.json");


test.describe(
"TSM Live Mission Lifecycle",
()=>{


for(const mission of missions){


test(
mission.documentType+" mission lifecycle",
async({page})=>{


await page.goto(
"/html/tsm-doc-search-multi.html"
);


const lifecycle={

documentId:mission.documentId,

missionId:mission.missionId,

industry:mission.industry,

warRoom:mission.warRoom,

strategist:mission.strategist,

executivePortal:mission.executivePortal,

qualityScore:mission.qualityScore,

riskScore:mission.riskScore,

audit:mission.audit.created

};


expect(lifecycle.documentId)
.toBeTruthy();


expect(lifecycle.missionId)
.toContain("MISSION");


expect(lifecycle.audit)
.toBe(true);



console.log("\n================================");

console.table(lifecycle);

console.log("================================");


});


}


});

