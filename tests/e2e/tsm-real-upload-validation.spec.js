const { test, expect } = require('@playwright/test');

test('Universal intake upload creates enterprise mission', async ({ page }) => {

  await page.goto(
    'http://localhost:8080/html/tsm-doc-search-multi.html'
  );

  const upload = page.locator('#doc-file-input');

  await expect(upload).toHaveCount(1);

  await upload.setInputFiles(
    'demo-documents/healthcare/UB-04.pdf'
  );


  await page.waitForTimeout(3000);


  await expect(
    page.locator('text=Healthcare')
  ).toBeVisible();


  await expect(
    page.locator('text=MISSION')
  ).toBeVisible();

});