const { chromium } = require('@playwright/test');
const url = process.argv[2];
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  page.on('pageerror', err => console.log('[pageerror]', err.message));
  page.on('response', async res => {
    const type = res.request().resourceType();
    if (type === 'fetch' || type === 'xhr') {
      const ct = res.headers()['content-type'] || '';
      console.log('[FETCH]', res.status(), ct, res.url());
      if (ct.includes('text/html')) {
        console.log('  ^^^ SUSPECT: fetch returned HTML, not JSON/JS');
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
