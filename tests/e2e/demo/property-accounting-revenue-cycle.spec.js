// Playwright spec for html/construction-suite/property-accounting-revenue-cycle.html
// NOT live-run in the sandbox that authored this file (no Chromium/network path to
// download it here — same limitation noted elsewhere in this repo's history).
// Logic for the new journal-entry/AP-approval/budget-edit functions was verified
// separately via a jsdom harness (see PR description) since Playwright wasn't
// available. Run this for real in the Codespace before trusting it fully:
//   npx playwright test tests/e2e/demo/property-accounting-revenue-cycle.spec.js

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:8080';
const PAGE_PATH = '/construction-suite/property-accounting-revenue-cycle.html';
const MISSION_ID = 'PA-MEC-001';

// The page's missionId is hardcoded (see html/.../property-accounting-revenue-cycle.html
// const mission = { missionId: "PA-MEC-001", ... }), and paEnsureMission() on the
// backend is first-write-wins -- it never re-seeds an existing mission doc. Against
// a real persisted-Mongo backend that means every past e2e run's journal entries /
// AP approvals stay in the database forever, so the stateful tests below (which
// assert a pristine starting ledger/AP queue) only pass on the very first run ever
// made against this missionId. Reset before each so repeat runs are deterministic.
async function resetMission(request) {
  const res = await request.post(BASE_URL + '/api/property-accounting/' + MISSION_ID + '/reset');
  if (!res.ok()) throw new Error('Mission reset failed: ' + res.status() + ' ' + (await res.text()));
}

const EXISTING_STRATEGIST_PAYLOAD = {
  summary: 'Existing BNCA synthesis text',
  bncaText: 'Existing BNCA synthesis text',
  docType: 'risk-brief',
  engines: { e1: '...' },
  wip: [{ id: 'engines', label: 'Engine Analysis', status: 'done' }],
  explain: [{ claim: 'Construction — Strategist Synthesis' }],
  timestamp: '2026-08-01T00:00:00.000Z',
};

test.describe('Property Accounting & Revenue Cycle (construction-suite)', () => {
  test.beforeEach(async ({ request }) => {
    await resetMission(request);
  });

  test('renders KPIs, revenue cycle steps, and exception queue', async ({ page }) => {
    page.on('pageerror', (err) => { throw new Error('[PAGE ERROR] ' + err.message); });

    await page.goto(BASE_URL + PAGE_PATH);

    await expect(page).toHaveTitle(/Property Accounting/);

    const kpis = await page.locator('.kpi').allTextContents();
    expect(kpis.map((k) => k.trim())).toEqual(
      expect.arrayContaining(['$482,000', '$517,400', '+7.3%', 'EXCEPTIONS'])
    );

    const steps = await page.locator('.fstep-title').allTextContents();
    expect(steps.map((s) => s.trim())).toEqual([
      'Draft Pay Application',
      'Owner / Architect Certification',
      'Invoice & Post to AR',
      'Collections & Retainage Release',
    ]);

    // scoped by id so this doesn't collide with the AP queue / GL ledger tables
    await expect(page.locator('#exceptionQueueBody tr')).toHaveCount(7);
  });

  test('RUN CLOSE ANALYSIS renders real figures in the brief', async ({ page }) => {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.getByRole('button', { name: 'RUN CLOSE ANALYSIS' }).click();

    const brief = await page.locator('#brief').textContent();
    expect(brief).toContain('$482,000');
    expect(brief).toContain('+7.3%');
    expect(brief).toContain('EXCEPTIONS REQUIRE REVIEW');
  });

  test('ESCALATE TO STRATEGIST merges into TSM_CONSTRUCTION_STRATEGIST_RELAY without clobbering existing fields', async ({ page }) => {
    await page.addInitScript((payload) => {
      sessionStorage.setItem('TSM_CONSTRUCTION_STRATEGIST_RELAY', JSON.stringify(payload));
      localStorage.setItem('tsm_construction_strategist_output', JSON.stringify(payload));
    }, EXISTING_STRATEGIST_PAYLOAD);

    await page.goto(BASE_URL + PAGE_PATH);
    await page.getByRole('button', { name: 'ESCALATE TO STRATEGIST' }).click();

    const merged = await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem('TSM_CONSTRUCTION_STRATEGIST_RELAY'))
    );
    const mergedLocal = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('tsm_construction_strategist_output'))
    );

    expect(merged.summary).toBe(EXISTING_STRATEGIST_PAYLOAD.summary);
    expect(merged.wip).toEqual(EXISTING_STRATEGIST_PAYLOAD.wip);
    expect(merged.explain).toEqual(EXISTING_STRATEGIST_PAYLOAD.explain);
    expect(merged.propertyAccounting).toBeTruthy();
    expect(merged.propertyAccounting.missionId).toBe('PA-MEC-001');
    expect(merged.propertyAccounting.budget).toBe(482000);
    expect(merged).toEqual(mergedLocal);
  });

  test('FEED EXCEPTION QUEUE writes real records into TSMExceptions (sector: construction)', async ({ page }) => {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.getByRole('button', { name: 'FEED EXCEPTION QUEUE' }).click();

    const records = await page.evaluate(() => window.TSMExceptions.getAll('construction'));
    expect(records).toHaveLength(7);
    for (const r of records) {
      expect(r.sector).toBe('construction');
      expect(['P1', 'P2', 'P3']).toContain(r.priority);
      expect(r.title).toBeTruthy();
      expect(r.exceptionId).toMatch(/^exc_/);
    }
  });

  test('Construction Hub links to the page and it is reachable', async ({ page }) => {
    await page.goto(BASE_URL + '/construction-suite/construction-hub.html');
    const link = page.locator('a[href="/construction-suite/property-accounting-revenue-cycle.html"]').first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/property-accounting-revenue-cycle\.html/);
    await expect(page).toHaveTitle(/Property Accounting/);
  });

  // ---- New coverage: journal entries, AP approval workflow, budget editing ----

  test('posting an unbalanced then balancing journal entry updates reconciliation status', async ({ page }) => {
    await page.goto(BASE_URL + PAGE_PATH);

    await expect(page.locator('#glBalanceSub')).toHaveText('No entries posted yet');
    await expect(page.locator('#resolveReconBtn')).toBeDisabled();

    await page.selectOption('#jeAccount', 'Construction Expense');
    await page.selectOption('#jeType', 'debit');
    await page.fill('#jeAmount', '5000');
    await page.fill('#jeDesc', 'Test debit entry');
    await page.getByRole('button', { name: 'POST ENTRY' }).click();

    await expect(page.locator('#kpiActual')).toContainText('522,400');
    await expect(page.locator('#glBalanceSub')).toContainText('out of balance');
    await expect(page.locator('#resolveReconBtn')).toBeDisabled();

    await page.selectOption('#jeAccount', 'Cash');
    await page.selectOption('#jeType', 'credit');
    await page.fill('#jeAmount', '5000');
    await page.fill('#jeDesc', 'Test credit entry');
    await page.getByRole('button', { name: 'POST ENTRY' }).click();

    await expect(page.locator('#glBalanceSub')).toContainText('balanced');
    await expect(page.locator('#resolveReconBtn')).toBeEnabled();

    await expect(page.locator('#exc-recon')).toBeVisible();
    await page.locator('#resolveReconBtn').click();
    await expect(page.locator('#exc-recon')).toHaveCount(0);
  });

  test('approving an AP invoice posts offsetting ledger lines and updates KPIs; rejecting does not', async ({ page }) => {
    await page.goto(BASE_URL + PAGE_PATH);

    await expect(page.locator('#apQueueBody tr')).toHaveCount(3);
    await expect(page.locator('#kpiApPending')).toHaveText('3');

    await page.locator('#apQueueBody tr').nth(0).getByRole('button', { name: 'APPROVE' }).click();
    await expect(page.locator('#glLedgerBody tr')).toHaveCount(2);
    await expect(page.locator('#kpiApPending')).toHaveText('2');
    await expect(page.locator('#exc-ap-pending-text')).toContainText('2 AP invoices');

    await page.locator('#apQueueBody tr').nth(1).getByRole('button', { name: 'REJECT' }).click();
    await expect(page.locator('#glLedgerBody tr')).toHaveCount(2); // unchanged
    await expect(page.locator('#kpiApPending')).toHaveText('1');

    await page.locator('#apQueueBody tr').nth(2).getByRole('button', { name: 'APPROVE' }).click();
    await expect(page.locator('#kpiApPending')).toHaveText('0');
    await expect(page.locator('#exc-ap-pending')).toHaveCount(0);
  });

  test('editing the budget recalculates KPI cards live and rejects invalid input', async ({ page }) => {
    await page.goto(BASE_URL + PAGE_PATH);

    await page.fill('#budgetInput', '600000');
    await page.getByRole('button', { name: 'SAVE BUDGET' }).click();

    await expect(page.locator('#kpiBudget')).toContainText('600,000');
    await expect(page.locator('#kpiVarianceSub')).toHaveText('Under budget');
    await expect(page.locator('#budgetSaveMsg')).toContainText('saved');

    const budgetBefore = await page.locator('#kpiBudget').textContent();
    await page.fill('#budgetInput', '-50');
    await page.getByRole('button', { name: 'SAVE BUDGET' }).click();
    await expect(page.locator('#kpiBudget')).toHaveText(budgetBefore);
    await expect(page.locator('#budgetSaveMsg')).toContainText('valid budget amount');
  });
});
