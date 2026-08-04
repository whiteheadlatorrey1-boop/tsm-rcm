const { test } = require('@playwright/test');
const path = require('path');
const { runStory, loadStory } = require('../../../demo/demo-engine');

// Point this at your running TSM server (Codespace forwarded port or localhost).
const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:8080';

test('Insurance executive demo', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  test.setTimeout(120_000);

  // insurance-war-room.html has the same auto-launching guided tour as
  // finops — the overlay intercepts clicks unless this flag is pre-set.
  await page.addInitScript(() => {
    localStorage.setItem('ins_war_tour_done', '1');
  });

  const story = loadStory(path.join(__dirname, '../../../demo/insurance-demo.json'));
  const outDir = path.join(__dirname, 'screenshots', 'insurance');

  await runStory(page, {
    steps: story.steps,
    outDir,
    baseURL: BASE_URL,
  });
});
