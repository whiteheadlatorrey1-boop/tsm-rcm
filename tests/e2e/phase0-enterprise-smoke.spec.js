

const {test,expect}=require("@playwright/test");


test(
"TSM Phase 0 Demo Flow",

async({page})=>{


await page.goto(
"/html/tsm-doc-search-multi.html"
);


await expect(
page
).toHaveTitle(/TSM/i);


await page.screenshot({

path:
"reports/screenshots/phase0-intake.png"

});


});

