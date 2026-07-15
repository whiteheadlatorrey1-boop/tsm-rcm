const {test,expect}=require("@playwright/test");

test("Mortgage Evidence Governance V12",async({page})=>{

await page.goto(
"/html/war-rooms/mortgage/mortgage-governance.html"
);

await expect(
page.getByText("Mortgage Evidence & Governance Center")
).toBeVisible();

await expect(
page.getByText("Evidence Ledger")
).toBeVisible();

});
