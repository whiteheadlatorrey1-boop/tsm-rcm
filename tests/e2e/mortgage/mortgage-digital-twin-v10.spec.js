const {test,expect}=require('@playwright/test');


test('Mortgage Digital Twin Platform V10', async({page})=>{

await page.goto(
'/html/war-rooms/mortgage/mortgage-digital-twin-platform.html'
);


await expect(
page.getByText('Mortgage Digital Twin Platform V10')
).toBeVisible();


});
