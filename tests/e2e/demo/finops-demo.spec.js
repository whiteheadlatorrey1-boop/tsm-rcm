const { test } = require('@playwright/test');
const path = require('path');
const { runStory, loadStory } = require('../../../demo/demo-engine');

// Point this at your running TSM server (Codespace forwarded port or localhost).
const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:8080';

test('FinOps executive demo', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  test.setTimeout(120_000);

  // finops-war-room.html auto-launches a guided tour 800ms after load unless
  // this flag is already set, and the tour overlay intercepts pointer events
  // on every click behind it — including the sample-doc chip.
  await page.addInitScript(() => {
    localStorage.setItem('finops_war_tour_done', '1');
  });

  const story = loadStory(path.join(__dirname, '../../../demo/finops-demo.json'));
  const outDir = path.join(__dirname, 'screenshots', 'finops');

  await runStory(page, {
    steps: story.steps,
    outDir,
    baseURL: BASE_URL,
  });
});
