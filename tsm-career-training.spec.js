const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:8080';
const PAGE_URL = `${BASE}/html/tsm-career-training-platform.html`;

// ── every panel wired into the nav, in switchTo() id form ──
const PANELS = [
  'overview', 'registry', 'profile', 'assignment',
  'hc', 'crcr', 'rcm-director', 'finops', 'insurance', 'ahip',
  'realestate', 'mlo', 'bpo', 'msai', 'career', 'interview',
  'readiness', 'hitl',
  'deployment', 'earning', 'manager', 'governance', 'staffing',
  'staffing-coord', 'retention'
];

function attachErrorListeners(page) {
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => pageErrors.push(err.message));
  page.on('response', res => { if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.url()}`); });
  return { consoleErrors, pageErrors, failedRequests };
}

// ══════════════════════════════════════════════════════════
// 1. EVERY PANEL LOADS CLEAN
// ══════════════════════════════════════════════════════════
test.describe('Career Training Platform · Panel Load', () => {
  for (const panelId of PANELS) {
    test(`panel loads clean · ${panelId}`, async ({ page }) => {
      const { consoleErrors, pageErrors, failedRequests } = attachErrorListeners(page);

      await page.goto(PAGE_URL);
      await page.click(`.nav-item[data-panel="${panelId}"]`);
      await page.waitForTimeout(300);

      const panel = page.locator(`#panel-${panelId}`);
      await expect(panel).toHaveClass(/active/);
      await expect(panel).toBeVisible();

      expect(consoleErrors, `console errors on ${panelId}`).toEqual([]);
      expect(pageErrors, `page errors on ${panelId}`).toEqual([]);
      expect(failedRequests, `failed requests on ${panelId}`).toEqual([]);
    });
  }
});

// ══════════════════════════════════════════════════════════
// 2. GROQ PROXY — DIRECT API CHECK, NO BROWSER NEEDED
// ══════════════════════════════════════════════════════════
test.describe('Career AI Proxy · /api/career/ai-complete', () => {
  test('returns 200 with non-empty completion text', async ({ request }) => {
    const res = await request.post(`${BASE}/api/career/ai-complete`, {
      data: { messages: [{ role: 'user', content: 'Reply with exactly: PONG' }] }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.content)).toBe(true);
    expect(body.content[0].type).toBe('text');
    expect(body.content[0].text.trim().length).toBeGreaterThan(0);
  });

  test('rejects a request with no messages', async ({ request }) => {
    const res = await request.post(`${BASE}/api/career/ai-complete`, { data: {} });
    expect(res.status()).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════
// 3. INTERVIEW PROOF MAP — FULL INTERACTIVE FLOW
// ══════════════════════════════════════════════════════════
test.describe('Interview Proof Map · live simulator', () => {
  test('select question → select lens → generate → copy → clear', async ({ page }) => {
    test.setTimeout(30000);
    await page.goto(PAGE_URL);
    await page.click('.nav-item[data-panel="interview"]');

    // STEP 1 — select a question
    await page.click('.iq-qbtn:has-text("HITL Implementation")');
    const selectedQ = page.locator('#iq-selected-q');
    await expect(selectedQ).toBeVisible();
    await expect(selectedQ).toContainText('Human-in-the-Loop');

    // STEP 2 — select a lens
    await page.click('.iq-lbtn:has-text("HC Denial War Room")');
    const selectedLens = page.locator('#iq-selected-lens');
    await expect(selectedLens).toBeVisible();
    await expect(selectedLens).toContainText('HC Denial War Room');

    // STEP 3 — generate (real AI call, allow time)
    await page.click('button:has-text("GENERATE ANSWER")');
    await expect(page.locator('#iq-loading')).toBeVisible();
    await expect(page.locator('#iq-output')).toBeVisible({ timeout: 20000 });
    const outputText = await page.locator('#iq-output').textContent();
    expect(outputText.trim().length).toBeGreaterThan(20);
    await expect(page.locator('#iq-meta')).toBeVisible();

    // STEP 4 — copy (just confirm no throw / button feedback)
    await page.click('#iq-copy-btn');
    await expect(page.locator('#iq-copy-btn')).toContainText('COPIED');

    // STEP 5 — clear resets everything
    await page.click('button:has-text("CLEAR")');
    await expect(selectedQ).toBeHidden();
    await expect(selectedLens).toBeHidden();
    await expect(page.locator('#iq-output')).toBeHidden();
  });

  test('generate without selecting question or lens shows an alert, does not crash', async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.click('.nav-item[data-panel="interview"]');
    page.once('dialog', dialog => dialog.accept());
    await page.click('button:has-text("GENERATE ANSWER")');
    // panel should still be intact, no thrown page error
  });
});

// ══════════════════════════════════════════════════════════
// 4. AB-100 COMMAND CENTER
// ══════════════════════════════════════════════════════════
test.describe('AB-100 Command Center · MSAI panel', () => {
  test('flashcard deck: flip, next, prev, shuffle', async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.click('.nav-item[data-panel="msai"]');

    const card = page.locator('#msai-fc');
    await expect(card).toBeVisible();

    await page.click('#msai-fc');
    await expect(card).toHaveClass(/flipped/);

    await page.click('button:has-text("NEXT")');
    await page.click('button:has-text("PREV")');
    await page.click('button:has-text("SHUFFLE")');
    // no assertion beyond "didn't throw" — deck order isn't deterministic
  });

  test('vocab filter narrows visible rows', async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.click('.nav-item[data-panel="msai"]');
    const totalRows = await page.locator('#msai-vlist .v-row').count();
    await page.fill('#msai-vs', 'zzzznomatch');
    const visibleAfter = await page.locator('#msai-vlist .v-row:visible').count();
    expect(visibleAfter).toBeLessThan(totalRows);
  });

  test('vertical selector toggles selected state', async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.click('.nav-item[data-panel="msai"]');
    const btn = page.locator('.msai-vbtn').first();
    await btn.click();
    await expect(btn).toHaveClass(/sel/);
  });

  test('AI tutor — explain returns non-empty text', async ({ page }) => {
    test.setTimeout(30000);
    await page.goto(PAGE_URL);
    await page.click('.nav-item[data-panel="msai"]');
    await page.click('button:has-text("EXPLAIN")');
    await expect(page.locator('#msai-output')).not.toHaveText('', { timeout: 20000 });
  });

  test('scenario generator + grading, end to end', async ({ page }) => {
    test.setTimeout(45000);
    await page.goto(PAGE_URL);
    await page.click('.nav-item[data-panel="msai"]');

    await page.click('button:has-text("GENERATE SCENARIO")');
    const scen = page.locator('#msai-scen');
    await expect(scen).toBeVisible();
    await expect(scen).not.toHaveText('⟳ Generating...', { timeout: 20000 });
    const scenText = await scen.textContent();
    expect(scenText.trim().length).toBeGreaterThan(10);

    await page.fill('#msai-ans', 'We would use a multi-agent HITL architecture with confidence scoring.');
    await page.click('button:has-text("GRADE")');
    const grade = page.locator('#msai-grade');
    await expect(grade).toBeVisible();
    await expect(grade).not.toHaveText('⟳ Grading...', { timeout: 20000 });
  });

  test('countdown timers render non-placeholder values', async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.click('.nav-item[data-panel="msai"]');
    await page.waitForTimeout(500);
    const d730 = await page.locator('#mcd730').textContent();
    const d100 = await page.locator('#mcd100').textContent();
    expect(d730.trim().length).toBeGreaterThan(0);
    expect(d100.trim().length).toBeGreaterThan(0);
  });
});

// ══════════════════════════════════════════════════════════
// 5. READINESS TRACKER → LOCALSTORAGE → MANAGER ROLLUP
// ══════════════════════════════════════════════════════════
test.describe('Cross-panel state · Readiness → Manager Dashboard', () => {
  test('checking a readiness item persists and reflects in manager KPIs', async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.click('.nav-item[data-panel="readiness"]');

    const firstCheckbox = page.locator('.readiness-cell input[type=checkbox]').first();
    const wasChecked = await firstCheckbox.isChecked();
    if (!wasChecked) await firstCheckbox.check();
    await expect(firstCheckbox).toBeChecked();

    // reload — localStorage should restore the checked state
    await page.reload();
    await page.click('.nav-item[data-panel="readiness"]');
    await expect(page.locator('.readiness-cell input[type=checkbox]').first()).toBeChecked();

    // manager dashboard should reflect a non-zero readiness average
    await page.click('.nav-item[data-panel="manager"]');
    const avgText = await page.locator('#mgr-avg-readiness').textContent();
    expect(avgText).toMatch(/\d+%/);
  });

  test('progression log records an approval entry', async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.click('.nav-item[data-panel="manager"]');
    await page.click('button:has-text("APPROVE & LOG")');
    const log = page.locator('#progression-log');
    await expect(log).not.toBeEmpty();
  });
});