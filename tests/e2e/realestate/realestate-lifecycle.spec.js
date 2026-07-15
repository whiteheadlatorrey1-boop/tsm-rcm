
const {test,expect}=require("@playwright/test");

test(
"TSM realestate enterprise lifecycle",
async({page})=>{

await page.goto(
"/html/war-rooms/realestate/realestate-war-room.html"
);

await expect(page).toHaveTitle(
/TSM/
);

});

