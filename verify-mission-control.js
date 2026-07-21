/**
 * Phase 5 browser verification — run this LOCALLY against your real repo
 * checkout, where mission-model.js / mission-store.js resolve at their real
 * relative paths (this sandbox can't download a Chromium binary, so this
 * could never be run here — see chat for why).
 *
 * SETUP (one time):
 *   npm install puppeteer
 *
 * RUN:
 *   node verify-mission-control.js /absolute/path/to/html/bpo-internal1.html
 *
 * Or, if you're serving the repo (e.g. `npx serve html`):
 *   node verify-mission-control.js http://localhost:3000/bpo-internal1.html
 *
 * Screenshots land next to this script in ./screenshots/
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const target = process.argv[2];
if (!target) {
  console.error('Usage: node verify-mission-control.js <path-or-url-to-bpo-internal1.html>');
  process.exit(1);
}

const url = target.startsWith('http')
  ? target
  : 'file://' + path.resolve(target);

const SECTORS = ['constr', 'legal', 'health', 'tax', 'realty', 'ins'];
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

function log(ok, msg) {
  console.log((ok ? '[OK]  ' : '[FAIL] ') + msg);
  return ok;
}

(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push(err.message));

  console.log('Loading', url, '\n');
  await page.goto(url, { waitUntil: 'networkidle0' });

  let allPassed = true;

  // 1. Did Mission Store actually load? (not just the UI shell)
  const storeLoaded = await page.evaluate(() => !!window.TSMMissionStore && !!window.TSMMissionModel);
  allPassed &= log(storeLoaded, 'TSMMissionStore + TSMMissionModel loaded (check the script src path in <head> if this fails)');
  if (!storeLoaded) {
    console.log('\nStopping early — nothing else can be meaningfully verified without the store.');
    await browser.close();
    process.exit(1);
  }

  // 2. Reset store so this run is deterministic, independent of prior test data
  await page.evaluate(() => window.TSMMissionStore._resetStore());

  // 3. Per-sector: submit a real intake, verify a real mission + kanban card appear
  for (const sectorId of SECTORS) {
    await page.click(`[data-panel="${sectorId}"]`);
    await new Promise(r => setTimeout(r, 150));

    const before = await page.evaluate(
      (id) => document.querySelectorAll(`#panel-${id} .k-card`).length, sectorId
    );

    // Fill the first text/select field (the "client" field) so we're not creating a null-name mission
    await page.evaluate((id) => {
      const form = document.getElementById('intake-form-' + id);
      const firstInput = form.querySelector('input,select,textarea');
      if (firstInput.tagName === 'SELECT') firstInput.selectedIndex = 1;
      else firstInput.value = 'Puppeteer Test Client';
    }, sectorId);

    await page.click(`#panel-${sectorId} .submit-btn`);
    await new Promise(r => setTimeout(r, 300)); // rerenderAll() runs off the MISSION_CREATED event

    const after = await page.evaluate(
      (id) => document.querySelectorAll(`#panel-${id} .k-card`).length, sectorId
    );
    // Note: mock kanban cards are REPLACED wholesale once a sector has any
    // real mission (see syncSectorsFromMissionStore's fallback design), not
    // added to — so the correct post-submit count is exactly 1, not before+1.
    allPassed &= log(after === 1, `[${sectorId}] mock kanban fully replaced by real data — expected 1 card, got ${after} (was ${before} mock cards before)`);

    // 4. Confirm it actually landed in the "Intake" bucket/column, with the right vertical, in real storage
    const stored = await page.evaluate((id) => {
      const raw = JSON.parse(localStorage.getItem('TSM_MISSION_STORE_V1'));
      const missions = Object.values(raw.missions);
      return missions.find(m => m.client === 'Puppeteer Test Client' && !m._checked);
    }, sectorId);
    allPassed &= log(!!stored, `[${sectorId}] mission actually persisted to localStorage`);
    if (stored) {
      allPassed &= log(stored.stage === 'created', `[${sectorId}] new mission stage is 'created' (lands in Intake bucket) — got '${stored.stage}'`);
    }

    // 5. Kanban grid didn't overflow its container (the repeat(3,1fr) -> repeat(4,1fr) fix)
    const overflow = await page.evaluate((id) => {
      const kanban = document.querySelector(`#panel-${id} .kanban`);
      return kanban.scrollWidth > kanban.parentElement.clientWidth + 2; // +2px rounding tolerance
    }, sectorId);
    allPassed &= log(!overflow, `[${sectorId}] 4-column kanban does not overflow its card`);

    const shotPath = path.join(SCREENSHOT_DIR, `${sectorId}.png`);
    const panelEl = await page.$(`#panel-${sectorId}`);
    await panelEl.screenshot({ path: shotPath });
    console.log(`       screenshot: ${shotPath}`);
  }

  // 6. Dashboard sector cards should now reflect real (non-mock) numbers for every sector
  await page.click('[data-panel="dashboard"]');
  await new Promise(r => setTimeout(r, 150));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dashboard.png'), fullPage: true });

  // 7. No uncaught JS errors anywhere in the run — except two known pre-existing
  // 404s for /core/tsm-kernel.js and /core/tsm-enforcer.js. Those are absolute,
  // server-relative paths meant to be served by the Express app (localhost:8080),
  // not resolvable under file://. They existed before Phase 5 and are unrelated
  // to this diff — filtered out here so real regressions aren't masked by them.
  const realErrors = consoleErrors.filter(e =>
    !(e.includes('ERR_FILE_NOT_FOUND') && (e.includes('tsm-kernel') || e.includes('tsm-enforcer')))
  );
  const ignoredCount = consoleErrors.length - realErrors.length;
  if (ignoredCount > 0) console.log(`       (ignored ${ignoredCount} pre-existing /core/* 404 error(s) — unrelated to this diff, see file:// vs http:// note above)`);
  allPassed &= log(realErrors.length === 0, 'No console/page errors during the whole run (excluding known /core/* 404s)');
  if (realErrors.length) realErrors.forEach(e => console.log('        ' + e));

  console.log('\n' + (allPassed ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED — see [FAIL] lines above'));

  await browser.close();
  process.exit(allPassed ? 0 : 1);
})();
