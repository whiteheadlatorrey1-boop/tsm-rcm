const { test } = require('@playwright/test');
const path = require('path');
const { runStory, loadStory } = require('../../../demo/demo-engine');

const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:8080';

test('Construction finance (bank recon) demo', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  test.setTimeout(120_000);

  await page.addInitScript(() => {
    localStorage.setItem('tsm_groq_key', 'demo-placeholder-key');
  });

  const story = loadStory(path.join(__dirname, '../../../demo/construction-finance-demo.json'));
  const outDir = path.join(__dirname, 'screenshots', 'construction-finance');

  await runStory(page, {
    steps: story.steps,
    outDir,
    presetLocalStorage: story.presetLocalStorage,
    baseURL: BASE_URL,
  });
});
