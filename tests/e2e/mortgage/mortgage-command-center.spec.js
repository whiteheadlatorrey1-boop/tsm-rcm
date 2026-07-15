const {test,expect}=require("@playwright/test");

test(
"Mortgage Command Center V5",
async({page})=>{

await page.goto(
"/html/war-rooms/mortgage/mortgage-command-center.html"
);

await expect(
page.getByText(
"TSM Mortgage Enterprise Command Center"
)
).toBeVisible();

await expect(
page.getByText(
"Active Loans: 12,482"
)
).toBeVisible();

});
