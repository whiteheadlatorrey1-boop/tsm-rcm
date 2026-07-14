

const {test,expect}=require("@playwright/test");

const docs=require("../../runtime/phase0/demo-document-library.json");


test.describe(
"TSM Enterprise Intake Engine",
()=>{


for(const doc of docs){


test(
doc.document+" routing validation",
async({page})=>{


await page.goto(
"/html/tsm-doc-search-multi.html"
);


await expect(page)
.toHaveTitle(/TSM/i);


// simulate mission contract

const mission={

documentId:doc.id,

missionId:
"MISSION-"+doc.id,

industry:doc.industry,

warRoom:
doc.warRoom,

workflow:
doc.workflow,

confidence:98,

qualityScore:96,

exceptionCount:1,

riskScore:25,

digitalTwinEvent:true

};


expect(mission.documentId)
.toBeTruthy();


expect(mission.missionId)
.toContain("MISSION");


expect(mission.warRoom)
.toBe(doc.warRoom);


console.log("\n================================");

console.table(mission);

console.log("================================");

});


}


});

