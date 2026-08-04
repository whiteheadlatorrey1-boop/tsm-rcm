const { test } = require('@playwright/test');
const path = require('path');
const { runStory, loadStory } = require('../../../demo/demo-engine');

const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:8080';

test('FinOps executive demo', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  test.setTimeout(120_000);

  page.on('pageerror', (err) => console.log('[PAGE ERROR]', err.message));
  page.on('requestfailed', (req) => console.log('[REQUEST FAILED]', req.url(), req.failure()?.errorText));
  page.on('response', (res) => {
    if (res.url().includes('/api/financial/query')) {
      console.log('[FINANCIAL QUERY RESPONSE]', res.status(), res.url());
    }
  });

  await page.addInitScript(() => {
    localStorage.setItem('finops_war_tour_done', '1');
    localStorage.setItem('tsm_groq_key', 'demo-placeholder-key');
  });

  const story = loadStory(path.join(__dirname, '../../../demo/finops-demo.json'));
  const outDir = path.join(__dirname, 'screenshots', 'finops');

  await runStory(page, {
    steps: story.steps,
    outDir,
    baseURL: BASE_URL,
  });
});
