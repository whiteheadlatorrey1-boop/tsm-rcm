const {test,expect}=require("@playwright/test");


test("Mortgage enterprise lifecycle", async({page})=>{


await page.goto(
"/html/tsm-doc-search-multi.html?sector=mortgage"
);


await expect(page.locator("body"))
.toContainText("TSM");


// Seed demo lifecycle
await page.evaluate(()=>{

localStorage.setItem(
"tsm_mortgage_demo",
JSON.stringify({

loanId:"LH-2026-00172",

stage:"UNDERWRITING",

borrower:"Alex Morgan",

amount:425000

})

);

});


await page.reload();


const body=
await page.locator("body").innerText();


expect(body.length)
.toBeGreaterThan(100);


});