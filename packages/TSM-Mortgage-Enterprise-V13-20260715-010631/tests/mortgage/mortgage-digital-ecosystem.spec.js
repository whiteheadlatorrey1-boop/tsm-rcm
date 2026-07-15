const {test,expect}=require("@playwright/test");


test(
"Mortgage Digital Ecosystem V7",
async({page})=>{


await page.goto(
"/html/war-rooms/mortgage/mortgage-digital-ecosystem.html"
);


await expect(
page.getByText(
"TSM Mortgage Digital Ecosystem"
)
).toBeVisible();


await expect(
page.getByText(
"Borrower Journey"
)
).toBeVisible();


});

