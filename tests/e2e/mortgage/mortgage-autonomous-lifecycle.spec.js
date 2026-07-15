

const {test,expect}=require("@playwright/test");


test(
"Mortgage autonomous lending lifecycle",

async({page})=>{


await page.goto(
"/html/war-rooms/mortgage/mortgage-digital-twin.html"
);


await expect(
page.getByText(
"Mortgage Enterprise Digital Twin"
)
)
.toBeVisible();


}

);

