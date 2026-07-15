const {test,expect}=require("@playwright/test");

test(
"Mortgage Network Intelligence V6",
async({page})=>{

await page.goto(
"/html/war-rooms/mortgage/mortgage-market-intelligence.html"
);

await expect(
page.getByText(
"TSM Mortgage Market Intelligence"
)
).toBeVisible();


await expect(
page.getByText(
"Rates: 6.25%"
)
).toBeVisible();

});

