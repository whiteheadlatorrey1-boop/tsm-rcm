const { test } = require('@playwright/test');
const path = require('path');
const { runStory, loadStory } = require('../../../demo/demo-engine');
const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:8080';
test('Supplier Shutdown executive demo', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const story = loadStory(path.join(__dirname, '../../../demo/supplier-shutdown-demo.json'));
  const outDir = path.join(__dirname, 'screenshots', 'supplier-shutdown');
  await runStory(page, {
    steps: story.steps,
    outDir,
    baseURL: BASE_URL,
  });
});
