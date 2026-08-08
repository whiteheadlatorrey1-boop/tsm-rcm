const { test } = require('@playwright/test');
const path = require('path');
const { runStory, loadStory } = require('../../../demo/demo-engine');
const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:8080';

test('DIAGNOSTIC: inspect state at escalate-to-exec', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    localStorage.setItem('tsm_groq_key', 'demo-placeholder-key');
  });

  const story = loadStory(path.join(__dirname, '../../../demo/construction-finance-demo.json'));
  // Run every step EXCEPT the last 3 (escalate/exec-portal-kpis/explainability)
  const stepsUpToSynthesis = story.steps.slice(0, 9); // through 007-run-bnca-synthesis
  const outDir = path.join(__dirname, 'screenshots', 'diagnostic');

  await runStory(page, {
    steps: stepsUpToSynthesis,
    outDir,
    presetLocalStorage: story.presetLocalStorage,
    baseURL: BASE_URL,
  });

  // Now dump the real state before we ever click escalate
  const state = await page.evaluate(() => {
    return {
      bncaOutputLength: document.getElementById('bncaOutput')?.textContent?.length ?? null,
      bncaOutputPreview: (document.getElementById('bncaOutput')?.textContent || '').slice(0, 200),
      escalateFnType: typeof window.escalateToExecutive,
      escalateFnSource: window.escalateToExecutive ? window.escalateToExecutive.toString().slice(0, 300) : null,
      mission: window.TSMState?.get ? window.TSMState.get('mission') : 'TSMState not available',
      currentUrl: window.location.href,
    };
  });
  console.log('=== DIAGNOSTIC STATE ===');
  console.log(JSON.stringify(state, null, 2));

  // Now actually try the click and capture what happens
  const clickResult = await page.evaluate(() => {
    try {
      window.escalateToExecutive();
      return { threw: false };
    } catch (e) {
      return { threw: true, message: e.message, stack: e.stack };
    }
  });
  console.log('=== CLICK RESULT ===');
  console.log(JSON.stringify(clickResult, null, 2));

  await page.waitForTimeout(2000);
  console.log('=== URL AFTER 2s ===', page.url());
});
