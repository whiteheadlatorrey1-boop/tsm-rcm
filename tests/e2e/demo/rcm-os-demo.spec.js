const { test } = require('@playwright/test');
const path = require('path');
const { runStory, loadStory } = require('../../../demo/demo-engine');

const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:8080';

test('RCM-OS cadence demo', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  test.setTimeout(60_000); // pure client-side cadence-tab switching, no live API calls

  page.on('pageerror', (err) => console.log('[PAGE ERROR]', err.message));
  page.on('requestfailed', (req) => console.log('[REQUEST FAILED]', req.url(), req.failure()?.errorText));

  const story = loadStory(path.join(__dirname, '../../../demo/rcm-os-demo.json'));
  const outDir = path.join(__dirname, 'screenshots', 'rcm-os');

  await runStory(page, {
    steps: story.steps,
    outDir,
    presetLocalStorage: story.presetLocalStorage,
    baseURL: BASE_URL,
  });
});