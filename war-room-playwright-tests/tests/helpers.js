// tests/helpers.js
const { expect } = require('@playwright/test');

/**
 * Navigate to a path and assert a healthy response with no uncaught JS
 * errors. Returns any console/page errors seen so callers can assert on
 * them explicitly (some pages may intentionally log warnings).
 */
async function gotoAndCheck(page, path) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  expect(response, `No response returned for ${path}`).not.toBeNull();
  expect(response.status(), `${path} responded with ${response.status()}`).toBeLessThan(400);
  await page.waitForLoadState('networkidle').catch(() => {
    // some pages hold a socket open (live relay/stream); don't fail the
    // whole test over it, DOMContentLoaded already succeeded above.
  });

  return errors;
}

/**
 * Best-effort "paste a sample document and run the engines" flow.
 * Real DOM/selectors for each war-room page weren't available at authoring
 * time (only the QA checklist copy was). This tries the button labels used
 * in that checklist ("Run all 4 engines", "Run scenario", etc). If your
 * live markup differs, add a data-testid to the run button and swap the
 * locator below for `page.getByTestId('run-engines')`.
 */
async function pasteSampleDocAndRun(page, sampleText) {
  const textarea = page.locator('textarea').first();
  if (await textarea.count()) {
    await textarea.fill(sampleText);
  }

  const runButtonPatterns = [
    /run all.*engines/i,
    /run engines/i,
    /run scenario/i,
    /run analysis/i,
    /^analyze$/i,
    /^run$/i,
  ];

  for (const pattern of runButtonPatterns) {
    const btn = page.getByRole('button', { name: pattern });
    if (await btn.count()) {
      await btn.first().click();
      return true;
    }
  }
  return false;
}

/**
 * Click an escalate/next-stage CTA and wait for the chain to advance
 * (war room -> strategist -> executive portal).
 */
async function escalate(page, pattern = /escalate/i) {
  const candidate = page
    .getByRole('link', { name: pattern })
    .or(page.getByRole('button', { name: pattern }));
  await expect(candidate.first()).toBeVisible({ timeout: 10_000 });

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => null),
    candidate.first().click(),
  ]);
}

/** Assert the page has no visible "error", "failed", or "undefined" banners. */
async function assertNoErrorBanners(page) {
  const badText = page.getByText(/uncaught|undefined is not|failed to fetch|500 internal|404 not found/i);
  await expect(badText, 'Page shows an unhandled error banner').toHaveCount(0);
}

module.exports = { gotoAndCheck, pasteSampleDocAndRun, escalate, assertNoErrorBanners };
