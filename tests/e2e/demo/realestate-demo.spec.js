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

  // The strategist page has an undocumented auto-escalation timer that fires
  // 1800ms after load and jumps straight to the Exec Portal unless this flag
  // is set. Without it, the manual "Full Strategic Brief" click races the
  // auto-chain and the recording skips the brief step entirely.
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
