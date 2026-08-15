const { test } = require('@playwright/test');
const path = require('path');
const { runStory, loadStory } = require('../../../demo/demo-engine');

const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:8080';

test('PM Copilot demo', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  test.setTimeout(60_000);

  const story = loadStory(path.join(__dirname, '../../../demo/pm-copilot-demo.json'));
  const outDir = path.join(__dirname, 'screenshots', 'pm-copilot');

  await runStory(page, {
    steps: story.steps,
    outDir,
    presetLocalStorage: story.presetLocalStorage,
    baseURL: BASE_URL,
  });
});
