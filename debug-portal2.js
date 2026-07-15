const { chromium } = require('@playwright/test');
const url = process.argv[2];
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  page.on('pageerror', err => console.log('[pageerror]', err.message, '\n', err.stack));
  page.on('response', async res => {
    const ct = res.headers()['content-type'] || '';
    if (res.status() >= 400) {
      console.log('[BAD STATUS]', res.status(), res.request().resourceType(), res.url());
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
