// tests/playwright/war-room-prep-noc-panel.spec.js
//
// Tests the NOC ("WIP Command Center") panel *inside* war-room-prep.html
// itself -- sidebar nav item, panel switch, checklist wiring, progress
// math, localStorage persistence, and reset. This is a different layer
// than war-room-prep-workflows.spec.js, which only checks that the NOC
// war room/strategist/executive URLs are reachable and linked from
// doc-search-multi.html. That spec never loads war-room-prep.html's own
// UI, so it wouldn't have caught the "nav item looks missing" issue this
// test guards against.
//
// Run via: npx playwright test tests/playwright/war-room-prep-noc-panel.spec.js
// Requires BASE_URL (default http://localhost:8080) pointing at a running
// `node server.js`.

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const PAGE_URL = `${BASE_URL}/html/war-rooms/war-room-prep.html`;
const STORAGE_KEY = 'tsm_war_room_prep_state_v1';

test.describe('War Room Prep — NOC (WIP Command Center) panel', () => {
  test.beforeEach(async ({ page }) => {
    // Clean slate every test -- this page persists checklist state to
    // localStorage, and a prior test's checked boxes would leak in.
    await page.goto(PAGE_URL, { waitUntil: 'load' });
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.reload({ waitUntil: 'load' });
  });

  test('sidebar nav item exists, labeled "WIP Command Center"', async ({ page }) => {
    const navItem = page.locator('a.nav-item[onclick*="switchTo(\'noc\')"]');
    await expect(navItem).toHaveCount(1);
    await expect(navItem).toContainText('WIP Command Center');
    await expect(page.locator('#nav-pct-noc')).toBeVisible();
  });

  test('clicking the nav item activates the NOC panel', async ({ page }) => {
    await page.click('a.nav-item[onclick*="switchTo(\'noc\')"]');
    const panel = page.locator('#panel-noc');
    await expect(panel).toHaveClass(/active/);
    await expect(panel).toBeVisible();
    await expect(panel.locator('.panel-title')).toHaveText('WIP Command Center');
  });

  test('panel links point at the real war room / strategist / executive portal pages', async ({ page }) => {
    await page.click('a.nav-item[onclick*="switchTo(\'noc\')"]');
    const panel = page.locator('#panel-noc');
    const links = panel.locator('.panel-url a');
    await expect(links).toHaveCount(3);
    const hrefs = await links.evaluateAll(els => els.map(e => e.getAttribute('href')));
    expect(hrefs).toEqual([
      '/html/war-rooms/noc/noc-war-room.html',
      '/html/war-rooms/noc/noc-strategist.html',
      '/html/war-rooms/noc/noc-executive-portal.html',
    ]);
  });

  test('all 4 checklist steps are present and start unchecked', async ({ page }) => {
    await page.click('a.nav-item[onclick*="switchTo(\'noc\')"]');
    for (let i = 0; i < 4; i++) {
      const cb = page.locator(`#chk-noc-${i}`);
      await expect(cb).toBeVisible();
      await expect(cb).not.toBeChecked();
    }
    await expect(page.locator('#pct-noc')).toHaveText('0%');
    await expect(page.locator('#nav-pct-noc')).toHaveText('0%');
    await expect(page.locator('#done-noc')).toBeHidden();
  });

  test('checking all 4 steps drives progress to 100% and shows the READY badge', async ({ page }) => {
    await page.click('a.nav-item[onclick*="switchTo(\'noc\')"]');

    for (let i = 0; i < 4; i++) {
      await page.check(`#chk-noc-${i}`);
    }

    await expect(page.locator('#pct-noc')).toHaveText('100%');
    await expect(page.locator('#nav-pct-noc')).toHaveText('100%');
    await expect(page.locator('#prog-noc')).toHaveCSS('width', /.*/); // sanity: has a width set
    const width = await page.locator('#prog-noc').evaluate(el => el.style.width);
    expect(width).toBe('100%');
    await expect(page.locator('#done-noc')).toBeVisible();
    await expect(page.locator('#done-noc')).toContainText('READY');
  });

  test('checked state persists across a reload (localStorage)', async ({ page }) => {
    await page.click('a.nav-item[onclick*="switchTo(\'noc\')"]');
    await page.check('#chk-noc-0');
    await page.check('#chk-noc-1');
    await expect(page.locator('#pct-noc')).toHaveText('50%');

    await page.reload({ waitUntil: 'load' });
    await page.click('a.nav-item[onclick*="switchTo(\'noc\')"]');

    await expect(page.locator('#chk-noc-0')).toBeChecked();
    await expect(page.locator('#chk-noc-1')).toBeChecked();
    await expect(page.locator('#chk-noc-2')).not.toBeChecked();
    await expect(page.locator('#pct-noc')).toHaveText('50%');
  });

  test('RESET clears all 4 steps back to 0%', async ({ page }) => {
    await page.click('a.nav-item[onclick*="switchTo(\'noc\')"]');
    for (let i = 0; i < 4; i++) await page.check(`#chk-noc-${i}`);
    await expect(page.locator('#pct-noc')).toHaveText('100%');

    await page.click('#panel-noc button.reset-btn');

    for (let i = 0; i < 4; i++) {
      await expect(page.locator(`#chk-noc-${i}`)).not.toBeChecked();
    }
    await expect(page.locator('#pct-noc')).toHaveText('0%');
    await expect(page.locator('#nav-pct-noc')).toHaveText('0%');
    await expect(page.locator('#done-noc')).toBeHidden();
  });

  test('"NEXT: DIGITAL TWIN" footer button navigates to the Digital Twin panel', async ({ page }) => {
    await page.click('a.nav-item[onclick*="switchTo(\'noc\')"]');
    await page.click('#panel-noc button.next-btn');
    const twinPanel = page.locator('#panel-digital-twin');
    await expect(twinPanel).toHaveClass(/active/);
  });
});