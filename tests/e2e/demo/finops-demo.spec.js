const { test } = require('@playwright/test');
const path = require('path');
const { runStory, loadStory } = require('../../../demo/demo-engine');

// Point this at your running TSM server (Codespace forwarded port or localhost).
const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:8080';

test('FinOps executive demo', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  test.setTimeout(180_000); // finops fires 6 sequential live Groq calls + a strategist report call; needs headroom under rate limits

  const story = loadStory(path.join(__dirname, '../../../demo/finops-demo.json'));
  const outDir = path.join(__dirname, 'screenshots', 'finops');

  await runStory(page, {
    steps: story.steps,
    outDir,
    presetLocalStorage: story.presetLocalStorage,
    baseURL: BASE_URL,
  });
});
