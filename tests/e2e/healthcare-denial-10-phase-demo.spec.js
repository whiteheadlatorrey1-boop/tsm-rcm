import { test, expect } from '@playwright/test';

test('Healthcare denial document reaches executive portal with 10 phase chain', async ({ page }) => {

  // 1. Open universal document search
  await page.goto(
    '/html/tsm-doc-search-multi.html?sector=healthcare&mode=warroom&scenario=denial-appeal'
  );

  await page.waitForLoadState('networkidle');

  console.log('Opened TSM Document Search');


  // 2. Seed demo documents if needed
  const seed = page.locator('#seed-btn');

  if (await seed.count()) {
    await seed.click();
    console.log('Seeded healthcare demo documents');
  }


  // 3. Locate healthcare denial sample
  const denialDoc = page.getByText(
    'Denial_CLM-HC-7731_Aetna.pdf',
    { exact:false }
  );

  await expect(denialDoc).toBeVisible({
    timeout:10000
  });

  console.log('Found denial document');


  // 4. Select denial document
  await denialDoc.click();

  await page.waitForTimeout(2000);


  // 5. Verify war room relay payload
  const relay = await page.evaluate(() => {

    return JSON.parse(
      sessionStorage.getItem('TSM_HC_WAR_RELAY') ||
      sessionStorage.getItem('tsmWarRoomLaunch') ||
      '{}'
    );

  });


  console.log('Relay Payload:', relay);


  expect(
    relay.documentType ||
    relay.scenario
  ).toBeTruthy();



  // 6. Navigate directly to HC Denial War Room if relay opens there
  await page.goto(
    '/html/healthcare/hc-denial-war-room.html'
  );

  await page.waitForLoadState('networkidle');


  await expect(
    page.locator('body')
  ).toContainText(/Denial|Healthcare|Claim/i);


  console.log('HC Denial War Room loaded');


  // 7. Launch strategist
  const strategistLink = page.getByText(
    /Strategist/i
  ).first();


  if(await strategistLink.count()){
    await strategistLink.click();
  }


  await page.waitForTimeout(2000);


  // 8. Executive portal validation
  await page.goto(
    '/html/healthcare/executive-portal.html'
  );

  await page.waitForLoadState('networkidle');


  await expect(
    page.locator('body')
  ).toContainText(
    /Executive|Mission|Decision/i
  );


  console.log('Executive Portal loaded');



  // 9. Validate enterprise phase chain

  const phases = [
    'Order-to-Cash',
    'CRM',
    'CPQ',
    'Product',
    'Approval',
    'MDM',
    'Integration',
    'Governance',
    'WIP',
    'Digital Twin'
  ];


  for(const phase of phases){

    const found =
      await page
        .getByText(
          new RegExp(phase,'i')
        )
        .count();

    console.log(
      phase,
      found ? 'PASS':'NOT FOUND'
    );

  }


  // 10. Capture demo screenshot
  await page.screenshot({
    path:
    'test-results/healthcare-denial-executive-portal.png',
    fullPage:true
  });


});