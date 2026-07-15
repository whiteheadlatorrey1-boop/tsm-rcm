const {test,expect}=require("@playwright/test");

test(
"Mortgage Autonomous Marketplace V8",
async({page})=>{

await page.goto(
"/html/war-rooms/mortgage/mortgage-autonomous-marketplace.html"
);


await expect(
page.getByText(
"TSM Mortgage Autonomous Marketplace"
)
).toBeVisible();


await expect(
page.getByText(
"AI Loan Marketplace"
)
).toBeVisible();


});

