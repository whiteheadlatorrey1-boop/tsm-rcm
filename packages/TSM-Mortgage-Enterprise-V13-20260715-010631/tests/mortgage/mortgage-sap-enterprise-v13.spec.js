const {test,expect}=require("@playwright/test");

test("Mortgage SAP Enterprise Phase V13",async({page})=>{

await page.goto(
"/html/war-rooms/mortgage/mortgage-executive-portal.html"
);

await expect(page).toHaveTitle(/Mortgage|TSM/);

});

