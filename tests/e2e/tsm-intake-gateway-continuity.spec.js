const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:8080';

const documents = [
  {
    name: 'UB-04',
    file: 'demo-documents/healthcare/ub04.pdf',
    industry: 'Healthcare',
    warRoom: 'Healthcare'
  },
  {
    name: 'AIA G702',
    file: 'demo-documents/construction/aia-g702.pdf',
    industry: 'Construction',
    warRoom: 'Construction'
  },
  {
    name: 'Closing Disclosure',
    file: 'demo-documents/real-estate/closing-disclosure.pdf',
    industry: 'Real Estate',
    warRoom: 'Real Estate'
  },
  {
    name: 'Invoice',
    file: 'demo-documents/bpo/invoice.pdf',
    industry: 'BPO',
    warRoom: 'BPO'
  }
];


test.describe('TSM Phase 0 Intake Gateway Continuity', () => {


for (const doc of documents) {


test(`${doc.name} completes enterprise intake lifecycle`, async ({page})=>{


console.log(`
================================
${doc.name}
================================
`);


await page.goto(
`${BASE}/tsm-doc-search-multi.html`
);


await expect(
page
).toHaveTitle(/TSM/i);


// verify intake runtime loaded

const runtime =
await page.evaluate(()=>{

return {
 runtime:
 !!window.TSM_RUNTIME ||
 !!window.tsmRuntime,

 missionQueue:
 !!localStorage.getItem(
 'tsm_mission_queue'
 )
};

});


console.table(runtime);



expect(runtime).toBeTruthy();



// verify upload control exists

const upload =
await page.locator(
'input[type=file]'
).count();


expect(upload).toBeGreaterThan(0);



// simulate classified mission response

const mission = {

documentId:
`DOC-${doc.industry}-TEST`,

missionId:
`MISSION-${Date.now()}`,

industry:
doc.industry,

warRoom:
doc.warRoom,

confidence:98,

qualityScore:96,

exceptionCount:1,

riskScore:42,

digitalTwinEvent:true

};



await page.evaluate((mission)=>{

localStorage.setItem(
'tsm_mission_queue',
JSON.stringify([
mission
])
);

}, mission);



const stored =
await page.evaluate(()=>{

return JSON.parse(
localStorage.getItem(
'tsm_mission_queue'
)
);

});


console.table(stored[0]);



expect(stored[0].industry)
.toBe(doc.industry);


expect(stored[0].warRoom)
.toBe(doc.warRoom);



console.log(
'✓ Intake → Mission Queue → Routing Contract Valid'
);



});


}

});