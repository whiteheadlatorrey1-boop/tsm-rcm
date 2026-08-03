// capture-screens.js (v4)
//
// Fixes vs v3:
//   - Deal Killer's "Running DEAL KILLER DETECTION..." loading text wasn't
//     in the not-loading list, so 01 was captured mid-run.
//   - War Room auto-starts a Guided Tour 800ms after load (see
//     re-war-room.html: setTimeout(() => startTour(), 800)), which blocked
//     the whole page. Now dismissed via the real endTour() button before
//     screenshotting.
//   - "text=STRATEGIC BRIEF" ambiguously matched BOTH the tab
//     ("STRATEGIC BRIEF") and the topbar button ("⚡ FULL STRATEGIC
//     BRIEF"), since Playwright's text= is substring/non-exact by
//     default. That silently failed (caught), and other fallback clicks
//     mis-happened. Every click below now targets a specific onclick
//     attribute instead of button text, which is unambiguous — these were
//     read directly out of the actual .html source, not guessed:
//       War Room  -> Strategist:  onclick="escalateToStrategist()"
//       Strategist -> Exec Portal: onclick="escalateToExec()"
//       Strategist "Strategic Brief" tab: onclick="switchPanel('brief',this)"
//       Strategist "Build Full Brief":    onclick="buildFullBrief()"
//       Exec Portal "Generate Brief":     onclick="generateBrief()"
//       Exec Portal "Deal Rescue Pack" nav: onclick="showPanel('rescue')"
//       Exec Portal "Launch Deal Rescue":   onclick="generateRescue()"
//       War Room tour exit:                 onclick="endTour()"
//   - Logs page.url() at every step so a future mismatch (like the
//     accidental early jump to Exec Portal last run) is obvious immediately
//     from the console instead of only visible in the screenshot.

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const OUT_DIR = path.join(__dirname, 'screenshots');
const BASE = 'https://app.tsmatter.com';

async function shot(page, name) {
  console.log('  url:', page.url());
  await page.screenshot({ path: path.join(OUT_DIR, name + '.png') });
  console.log('  📸', name);
}

async function clickOnclick(page, onclickValue, label) {
  const sel = `[onclick="${onclickValue}"]`;
  try {
    await page.click(sel, { timeout: 8000 });
    console.log('  ✓ clicked', label);
    return true;
  } catch {
    console.warn('  ✗ could not click', label, `(selector: ${sel})`);
    return false;
  }
}

async function waitUntilNotLoading(page, loadingStrings, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const bodyTxt = await page.evaluate(() => document.body.innerText).catch(() => '');
    const stillLoading = loadingStrings.some(s => bodyTxt.toLowerCase().includes(s.toLowerCase()));
    if (!stillLoading) return true;
    await page.waitForTimeout(600);
  }
  console.warn('  (timed out waiting for loading text to clear:', loadingStrings, ')');
  return false;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1366, height: 820 } });
  const page = await context.newPage();

  // ── 1. Deal Killer Detection ──────────────────────────────
  console.log('→ 01 Deal Killer Detection');
  await page.goto(`${BASE}/reo-pro/pack-engine.html?pack=deal-killer`, { waitUntil: 'networkidle' });
  await page.click('text=LOAD SAMPLE DOCUMENT').catch(() => {});
  await page.waitForTimeout(500);
  await page.click('text=RUN ANALYSIS').catch(() => {});
  await waitUntilNotLoading(page, ['running deal killer detection', 'click run analysis'], 30000);
  await page.waitForTimeout(800);
  await shot(page, '01-deal-killer-detection');

  // ── 2. War Room — dismiss the auto-tour, then shoot ───────
  console.log('→ 02 War Room');
  await page.goto(`${BASE}/html/war-rooms/re-war/re-war-room.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200); // tour auto-starts at 800ms
  await clickOnclick(page, 'endTour()', 'tour EXIT');
  await page.waitForTimeout(500);
  await shot(page, '02-war-room');

  // Run one module so there's something real to relay forward.
  await page.click('text=Investment Criteria').catch(() => {});
  await page.waitForTimeout(500);
  await page.click('text=READY').catch(() => {});
  await waitUntilNotLoading(page, ['generating', 'analyzing'], 25000);
  await page.waitForTimeout(1000);

  // ── 3. Escalate to Strategist ──────────────────────────────
  console.log('→ 03 Strategist (modules)');
  const escalated = await clickOnclick(page, 'escalateToStrategist()', 'ESCALATE → STRATEGIST');
  if (!escalated) {
    await page.goto(`${BASE}/html/war-rooms/re-war/re-strategist.html`, { waitUntil: 'networkidle' });
  } else {
    await page.waitForLoadState('networkidle').catch(() => {});
  }
  await page.waitForSelector('text=STRATEGIST ACTIVE', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await shot(page, '03-strategist-modules');

  // Run a strategist module so the Business Impact Delta actually computes.
  await page.click('text=Market Position Analysis').catch(() => {});
  await waitUntilNotLoading(page, ['generating', 'analyzing'], 30000);
  await page.waitForTimeout(1000);

  // ── 4. Strategic Brief ──────────────────────────────────────
  console.log('→ 04 Strategist (brief)');
  await clickOnclick(page, "switchPanel('brief',this)", 'STRATEGIC BRIEF tab');
  await page.waitForTimeout(500);
  await clickOnclick(page, 'buildFullBrief()', 'BUILD FULL BRIEF');
  await waitUntilNotLoading(page, ['generating strategic brief', 'generating'], 30000);
  await page.waitForTimeout(1000);
  await shot(page, '04-strategist-brief');

  // ── 5. Escalate to Exec Portal ───────────────────────────────
  console.log('→ 05 Exec Portal');
  const escalated2 = await clickOnclick(page, 'escalateToExec()', 'ESCALATE → EXEC PORTAL');
  if (!escalated2) {
    await page.goto(`${BASE}/html/war-rooms/re-war/re-exec-portal.html`, { waitUntil: 'networkidle' });
  } else {
    await page.waitForLoadState('networkidle').catch(() => {});
  }
  await page.waitForTimeout(1000);
  await clickOnclick(page, 'generateBrief()', 'GENERATE BRIEF');
  await waitUntilNotLoading(page, ['loading executive brief', 'loading'], 25000);
  await page.waitForTimeout(1000);
  await shot(page, '05-exec-portal');

  // ── 6. Deal Rescue Pack ───────────────────────────────────────
  console.log('→ 06 Deal Rescue Pack');
  await clickOnclick(page, "showPanel('rescue')", 'Deal Rescue Pack nav');
  await page.waitForTimeout(500);
  await clickOnclick(page, 'generateRescue()', 'LAUNCH DEAL RESCUE PACK');
  await waitUntilNotLoading(page, ['no ai recommendations to explain yet', 'loading'], 25000);
  await page.waitForTimeout(1000);
  await shot(page, '06-deal-rescue-pack');

  await browser.close();
  console.log('\nDone. Screenshots in', OUT_DIR);
})();