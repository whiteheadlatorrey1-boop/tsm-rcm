const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  // create a throwaway test file to upload
  const testFilePath = '/tmp/test-invoice.txt';
  fs.writeFileSync(testFilePath, 'Invoice #4471\nVendor: Acme Corp\nAmount: $12,450\nDue: 2026-08-01\nStatus: Denied - missing modifier');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('response', async res => {
    if (res.url().includes('doc-router/classify')) {
      console.log('CLASSIFY STATUS:', res.status());
      try { console.log('CLASSIFY BODY:', await res.text()); } catch (e) {}
    }
  });

  await page.goto('http://localhost:8080/html/tsm-doc-search-multi.html', { waitUntil: 'networkidle0' });

  const input = await page.$('input[type="file"]');
  if (!input) {
    console.log('NO FILE INPUT FOUND ON PAGE — check drop-zone implementation');
  } else {
    await input.uploadFile(testFilePath);
    await new Promise(r => setTimeout(r, 4000)); // let classify + mission build run

    const result = await page.evaluate(() => {
      try {
        const m = window.TSMMissionStore.listMissions().slice(-1)[0];
        return m ? m.workflow : 'NO MISSION FOUND';
      } catch (e) {
        return 'ERROR: ' + e.message;
      }
    });
    console.log('FINAL WORKFLOW RESULT:', JSON.stringify(result, null, 2));
  }

  await browser.close();
})();
