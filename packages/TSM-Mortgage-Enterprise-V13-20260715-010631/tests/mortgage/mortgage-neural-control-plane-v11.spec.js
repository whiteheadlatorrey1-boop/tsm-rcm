const {test,expect}=require('@playwright/test');

test('Mortgage Neural Control Plane V11', async({page})=>{

await page.goto(
'/html/war-rooms/mortgage/mortgage-neural-command-center.html'
);

await expect(
page.getByText('Mortgage Neural Control Plane V11')
).toBeVisible();

});
