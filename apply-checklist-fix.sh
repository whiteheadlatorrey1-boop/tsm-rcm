cat > tests/checklist.spec.js << 'CHECKLIST_SPEC_EOF'
// tests/checklist.spec.js
// Regression test for war-room-prep.html itself (the patched copy), not
// the live TSM demos. Confirms the STEPS off-by-one fix holds: checking
// every box in a sector lands on exactly 100%, survives a reload, and
// RESET actually clears every checkbox including the last one.
//
// Run standalone (doesn't need BASE_URL / a live server):
//   npx playwright test tests/checklist.spec.js --config=playwright.config.js
// Point CHECKLIST_PATH at wherever you serve the patched file, e.g.
//   CHECKLIST_PATH=file:///abs/path/to/war-room-prep.html npx playwright test tests/checklist.spec.js
//
// Notes on two fixes made after the first live run:
//   1. `{ force: true }` on every .check() — the page has a sticky
//      header + sticky left nav by design, which occasionally sits on
//      top of a checkbox mid-scroll and makes Playwright's real-pointer
//      click refuse to fire ("... intercepts pointer events"). We only
//      care about triggering the checkbox's change handler here, not
//      simulating a literal mouse click, so force is the right call.
//   2. `STEPS` / `WR_IDS` referenced bare (not `window.STEPS`) inside
//      page.evaluate() — top-level `const`/`let` in a classic <script>
//      tag do NOT attach to `window` (only `var` and `function`
//      declarations do). `switchTo`/`resetWr` work via `window.` because
//      they're `function` declarations; the const-declared data objects
//      don't, but ARE reachable as bare identifiers from evaluate()
//      since it runs as global code sharing the page's lexical scope.
const path = require('path');
const { test, expect } = require('@playwright/test');

const CHECKLIST_PATH =
  process.env.CHECKLIST_PATH ||
  'file://' + path.resolve(__dirname, '..', '..', 'war-room-prep__2__patched.html');

const SECTORS_WITH_FIXED_OFFBYONE = ['hc', 'finops', 'ins', 'con', 're']; // 5 declared -> 6 actual
const LEGAL = 'legal'; // 6 declared -> 7 actual

test.describe('war-room-prep.html — STEPS off-by-one regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(CHECKLIST_PATH);
    // Clear any persisted state from a previous run so each test starts clean.
    await page.evaluate(() => localStorage.removeItem('tsm_war_room_prep_state_v1'));
    await page.reload();
  });

  for (const id of SECTORS_WITH_FIXED_OFFBYONE) {
    test(`${id}: checking all 6 steps shows exactly 100%, not 120%`, async ({ page }) => {
      await page.evaluate((sectorId) => window.switchTo(sectorId), id);
      for (let i = 0; i < 6; i++) {
        await page.check(`#chk-${id}-${i}`, { force: true });
      }
      await expect(page.locator(`#pct-${id}`)).toHaveText('100%');
      await expect(page.locator(`#nav-pct-${id}`)).toHaveText('100%');
    });

    test(`${id}: last checkbox survives a reload`, async ({ page }) => {
      await page.evaluate((sectorId) => window.switchTo(sectorId), id);
      await page.check(`#chk-${id}-5`, { force: true });
      await page.reload();
      await page.evaluate((sectorId) => window.switchTo(sectorId), id);
      await expect(page.locator(`#chk-${id}-5`)).toBeChecked();
    });

    test(`${id}: RESET clears the last checkbox too`, async ({ page }) => {
      await page.evaluate((sectorId) => window.switchTo(sectorId), id);
      for (let i = 0; i < 6; i++) await page.check(`#chk-${id}-${i}`, { force: true });
      await page.evaluate((sectorId) => window.resetWr(sectorId), id);
      await expect(page.locator(`#chk-${id}-5`)).not.toBeChecked();
      await expect(page.locator(`#pct-${id}`)).toHaveText('0%');
    });
  }

  test(`${LEGAL}: checking all 7 steps shows exactly 100%`, async ({ page }) => {
    await page.evaluate(() => window.switchTo('legal'));
    for (let i = 0; i < 7; i++) {
      await page.check(`#chk-legal-${i}`, { force: true });
    }
    await expect(page.locator('#pct-legal')).toHaveText('100%');
  });

  test('bpo (unaffected by the bug): all 12 steps including both Honeywell items reach 100%', async ({ page }) => {
    await page.evaluate(() => window.switchTo('bpo'));
    for (let i = 0; i < 12; i++) {
      await page.check(`#chk-bpo-${i}`, { force: true });
    }
    await expect(page.locator('#pct-bpo')).toHaveText('100%');
    await expect(page.locator('#chk-bpo-11')).toBeChecked(); // Honeywell: Plant Incident + Cyber Incident
  });

  test('global readiness % never exceeds 100 across every section', async ({ page }) => {
    const allIds = await page.evaluate(() => WR_IDS);
    for (const id of allIds) {
      const stepsCount = await page.evaluate((sectionId) => STEPS[sectionId], id);
      await page.evaluate((sectionId) => window.switchTo(sectionId), id);
      for (let i = 0; i < stepsCount; i++) {
        const cb = page.locator(`#chk-${id}-${i}`);
        if (await cb.count()) await cb.check({ force: true });
      }
    }
    const globalPct = await page.locator('#g-pct').textContent();
    expect(Number(globalPct.replace('%', ''))).toBeLessThanOrEqual(100);
  });
});
CHECKLIST_SPEC_EOF
echo "--- verifying fix applied ---"
grep -c "force: true" tests/checklist.spec.js
grep -n "WR_IDS)" tests/checklist.spec.js