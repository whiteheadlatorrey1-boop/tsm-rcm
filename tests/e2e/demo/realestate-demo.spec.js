const { test } = require('@playwright/test');
const path = require('path');
const { runStory, loadStory } = require('../../../demo/demo-engine');

// Point this at your running TSM server (Codespace forwarded port or localhost).
const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:8080';

test('Real Estate executive demo', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  test.setTimeout(120_000);

  page.on('dialog', async (dialog) => {
    console.warn(`[demo-engine] unexpected ${dialog.type()} on ${page.url()}: "${dialog.message()}"`);
    await dialog.dismiss();
  });

  // re-strategist.html auto-escalates to re-exec-portal.html 1800ms after
  // loading a war-room payload (TSM AUTO-CHAIN), unless tsm_auto_mode='off'
  // is set in localStorage. This story deliberately captures the strategist
  // screen mid-flow (steps 006/007), so auto-chain must be disabled or the
  // page navigates itself away before those clicks can land.
  await page.addInitScript(() => {
    localStorage.setItem('tsm_auto_mode', 'off');
  });

  const story = loadStory(path.join(__dirname, '../../../demo/realestate-demo.json'));
  const outDir = path.join(__dirname, 'screenshots', 'realestate');

  await runStory(page, {
    steps: story.steps,
    outDir,
    baseURL: BASE_URL,
  });
});
