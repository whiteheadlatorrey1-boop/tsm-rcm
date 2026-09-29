const { test } = require('@playwright/test');

test('HC relay lifecycle diagnostic', async ({ page }) => {
  test.setTimeout(15000);

  const payload = {
    ts: Date.now(),
    summary:
      'DOCUMENT: eob-mesa-0417.pdf\n' +
      'TYPE: EOB\n' +
      'REF/CLAIM #: CLM-0334\n' +
      'EXPOSURE: $3,800',
    doc: {
      fileName: 'eob-mesa-0417.pdf',
      documentType: 'EOB',
      invoiceNo: 'CLM-0334',
      amount: 3800
    }
  };

  await page.addInitScript((payload) => {
    localStorage.setItem(
      'tsm_hc_docsearch_relay',
      JSON.stringify(payload)
    );

    // Prevent unrelated auto-run behavior from changing the result.
    localStorage.setItem('tsm_auto_mode', 'off');
  }, payload);

  page.on('console', msg => {
    console.log(`[console:${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', error => {
    console.log(`[PAGEERROR] ${error.message}`);
  });

  await page.goto(
    '/html/healthcare/hc-denial-war-room.html',
    { waitUntil: 'domcontentloaded' }
  );

  const checkpoints = [0, 100, 400, 600, 1000, 1500, 2000];
  let previous = 0;

  for (const delay of checkpoints) {
    await page.waitForTimeout(delay - previous);
    previous = delay;

    const state = await page.evaluate(() => ({
      docText:
        typeof docText !== 'undefined'
          ? docText
          : '__UNDEFINED__',

      textarea:
        document.getElementById('doc-text')?.value || '',

      status:
        document.getElementById('doc-status')?.textContent || '',

      processInfo:
        document.getElementById('process-info')?.textContent || '',

      relay:
        localStorage.getItem('tsm_hc_docsearch_relay'),

      legacyRelay:
        localStorage.getItem('TSM_HC_WAR_RELAY'),

      autoMode:
        localStorage.getItem('tsm_auto_mode'),

      readyState:
        document.readyState
    }));

    console.log(`\n=== ${delay}ms ===`);
    console.log(JSON.stringify(state, null, 2));
  }
});
