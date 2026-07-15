const {test,expect}=require('@playwright/test');

test('Mortgage Enterprise Operating System V9', async({page})=>{

await page.goto(
'/html/war-rooms/mortgage/mortgage-operating-system.html'
);

await expect(
page.getByText('Mortgage Operating System V9')
).toBeVisible();

});
