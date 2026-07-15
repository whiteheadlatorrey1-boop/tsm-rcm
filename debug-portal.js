const { chromium } = require('@playwright/test');
const url = process.argv[2];
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  page.on('pageerror', err => console.log('[pageerror]', err.message));
  page.on('response', async res => {
    if (res.request().resourceType() === 'script') {
      const ct = res.headers()['content-type'] || '';
      if (res.status() >= 400 || (!ct.includes('javascript') && !ct.includes('ecmascript'))) {
        console.log('[SUSPECT]', res.status(), ct, res.url());
      }
    }
  });
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 20000 });
    console.log('LOADED OK');
  } catch (e) {
    console.log('ERROR:', e.message);
  }
  await browser.close();
})();
