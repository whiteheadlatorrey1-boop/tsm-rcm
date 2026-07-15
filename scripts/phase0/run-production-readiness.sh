const { test, expect } = require('@playwright/test');

test.describe('TSM Real Upload Validation', () => {

  test('Universal intake upload creates enterprise mission', async ({ page }) => {

    await page.goto(
      'http://localhost:8080/html/tsm-doc-search-multi.html'
    );


    const upload =
      page.locator('#doc-file-input');


    await expect(upload).toHaveCount(1);


    await upload.setInputFiles(
      'demo-documents/healthcare/UB-04.pdf'
    );


    await page.waitForTimeout(5000);


    const body =
      await page.locator('body').innerText();


    console.log(`
================================
REAL UPLOAD VALIDATION
================================

${body}

================================
`);


    expect(body).toContain('Healthcare');

  });

});