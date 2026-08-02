const { test } = require('@playwright/test');
const path = require('path');
const { runStory, loadStory } = require('../../../demo/demo-engine');

// Point this at your running TSM server (Codespace forwarded port or localhost).
const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:8080';

test('Mortgage executive demo', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  test.setTimeout(120_000);

  const story = loadStory(path.join(__dirname, '../../../demo/mortgage-demo.json'));
  const outDir = path.join(__dirname, 'screenshots', 'mortgage');

  await runStory(page, {
    steps: story.steps,
    outDir,
    baseURL: BASE_URL,
  });
});
