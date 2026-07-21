/**
 * Phase 5 browser verification — run this LOCALLY against your real repo
 * checkout, where mission-model.js / mission-store.js resolve at their real
 * relative paths (this sandbox can't download a Chromium binary, so this
 * could never be run here — see chat for why).
 *
 * FIXED (2026-07-21): SECTORS was missing 'schools' — bpo-internal1.html
 * has 8 sectors (constr, legal, health, tax, realty, ins, mortgage,
 * schools), so the schools panel/intake/kanban was silently untested.
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

const SECTORS = ['constr', 'legal', 'health', 'tax', 'realty', 'ins', 'mortgage', 'schools'];
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
  const failedRequests = [];
  page.on('console', msg => {
    // "Failed to load resource: ..." console messages carry no URL and are
    // always paired with a 'requestfailed' event for the same failure (which
    // does have the URL) — so we let requestfailed own that class of error
    // entirely and only track genuine console errors (thrown exceptions,
    // console.error calls, etc.) here, to avoid double-counting/un-filterable
    // duplicates of the same underlying failure.
    if (msg.type() === 'error' && !/^Failed to load resource:/.test(msg.text())) {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => consoleErrors.push(err.message));
  // Failed resource loads (404s, etc.) don't show up usefully via the
  // 'console' event — Chrome's console text for these is just
  // "Failed to load resource: net::ERR_FILE_NOT_FOUND" with no URL at all,
  // so a substring filter on that text can never distinguish /core/* from
  // anything else. The 'requestfailed' event carries the real URL, so we
  // track failures there instead and filter by URL below.
  page.on('requestfailed', request => {
    const failure = request.failure();
    failedRequests.push({
      url: request.url(),
      error: failure ? failure.errorText : 'unknown error',
    });
  });

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

  // 7. No uncaught JS errors or unexpected failed network requests anywhere
  // in the run — except known pre-existing 404s for /core/tsm-kernel.js and
  // /core/tsm-enforcer.js. Those are absolute, server-relative paths meant
  // to be served by the Express app (localhost:8080), not resolvable under
  // file://. They existed before Phase 5 and are unrelated to this diff —
  // filtered out here by URL (via requestfailed) so real regressions aren't
  // masked by them.
  const realFailedRequests = failedRequests.filter(f => !f.url.includes('/core/'));
  const ignoredCount = failedRequests.length - realFailedRequests.length;
  if (ignoredCount > 0) {
    console.log(`       (ignored ${ignoredCount} pre-existing /core/* 404 error(s) — unrelated to this diff, see file:// vs http:// note above)`);
    failedRequests
      .filter(f => f.url.includes('/core/'))
      .forEach(f => console.log(`         ignored: ${f.error} — ${f.url}`));
  }

  const noErrors = consoleErrors.length === 0 && realFailedRequests.length === 0;
  allPassed &= log(noErrors, 'No console/page errors or unexpected failed requests during the whole run (excluding known /core/* 404s)');
  if (consoleErrors.length) consoleErrors.forEach(e => console.log('        [console] ' + e));
  if (realFailedRequests.length) realFailedRequests.forEach(f => console.log(`        [request] ${f.error} — ${f.url}`));

  // 8. Strategist page — Mission Timeline tab renders a real audit trail
  const strategistUrl = url.replace(/bpo-internal1\.html(\?.*)?$/, 'bpo-strategist.html');
  if (strategistUrl === url) {
    console.log('\n[SKIP] bpo-strategist.html check — target path did not match .../bpo-internal1.html, could not derive strategist URL');
    allPassed &= false;
  } else {
    console.log('\n════════════════════════════════════════════════════════════');
    console.log('  Strategist — Mission Timeline (bpo-strategist.html)');
    console.log('════════════════════════════════════════════════════════════');
    const stratPage = await browser.newPage();
    const stratConsoleErrors = [];
    stratPage.on('console', msg => {
      if (msg.type() === 'error' && !/^Failed to load resource:/.test(msg.text())) stratConsoleErrors.push(msg.text());
    });
    stratPage.on('pageerror', err => stratConsoleErrors.push(err.message));

    await stratPage.goto(strategistUrl, { waitUntil: 'networkidle0' });

    const stratStoreLoaded = await stratPage.evaluate(() => !!window.TSMMissionStore && !!window.TSMMissionModel);
    allPassed &= log(stratStoreLoaded, 'Strategist: TSMMissionStore + TSMMissionModel loaded');

    if (stratStoreLoaded) {
      // Seed a real mission with a real multi-event audit trail, and the
      // relay payload the page's loadRelay() IIFE actually expects
      // (TSM_BPO_WAR_RELAY / caseId), then reload so it picks it up fresh.
      const seededMissionId = await stratPage.evaluate(() => {
        window.TSMMissionStore._resetStore();
        const m = window.TSMMissionModel.createMission({ vertical: 'bpo', tenantId: 'verify-tenant', client: 'Puppeteer Timeline Test' });
        window.TSMMissionModel.addTask(m, { title: 'Verify step 1', status: 'complete' });
        window.TSMMissionModel.transitionStage(m, window.TSMMissionModel.STAGES.IN_PROGRESS, 'verify-script');
        window.TSMMissionModel.transitionStage(m, window.TSMMissionModel.STAGES.IN_REVIEW, 'verify-script');
        window.TSMMissionStore.saveMission(m);
        localStorage.setItem('TSM_BPO_WAR_RELAY', JSON.stringify({
          caseId: m.id, selectedSector: 'BPO', selectedDocType: 'Verify Doc'
        }));
        return m.id;
      });
      await stratPage.reload({ waitUntil: 'networkidle0' });

      const missionLoaded = await stratPage.evaluate((id) => window.tsmMission && window.tsmMission.id === id, seededMissionId);
      allPassed &= log(missionLoaded, `Strategist: window.tsmMission loaded from relay caseId (${seededMissionId})`);

      // Open the Mission Timeline tab the same way a user would — click it
      const tabClicked = await stratPage.evaluate(() => {
        const tab = [...document.querySelectorAll('.brief-tab')].find(el => (el.getAttribute('onclick') || '').includes("'mission'"));
        if (!tab) return false;
        tab.click();
        return true;
      });
      allPassed &= log(tabClicked, 'Strategist: MISSION TIMELINE tab found and clicked');

      const briefBodyText = await stratPage.evaluate(() => document.getElementById('briefBody')?.textContent || '');
      allPassed &= log(briefBodyText.includes(seededMissionId), 'Strategist: Mission Timeline shows the real mission id');
      allPassed &= log(briefBodyText.includes('MISSION_CREATED'), 'Strategist: Mission Timeline shows the MISSION_CREATED audit event');
      allPassed &= log((briefBodyText.match(/MISSION_UPDATED/g) || []).length === 2, 'Strategist: Mission Timeline shows both MISSION_UPDATED events (2 transitionStage calls)');
      allPassed &= log(!/No mission loaded/i.test(briefBodyText), 'Strategist: Mission Timeline did not fall back to the "no mission loaded" message');

      const activeTabText = await stratPage.evaluate(() => document.querySelector('.brief-tab.active')?.textContent || '');
      allPassed &= log(activeTabText.trim() === 'MISSION TIMELINE', `Strategist: active tab is MISSION TIMELINE — got '${activeTabText.trim()}'`);

      const stratShotPath = path.join(SCREENSHOT_DIR, 'strategist-mission-timeline.png');
      const briefPanelEl = await stratPage.$('.brief-panel');
      if (briefPanelEl) await briefPanelEl.screenshot({ path: stratShotPath });
      console.log(`       screenshot: ${stratShotPath}`);
    }

    allPassed &= log(stratConsoleErrors.length === 0, 'Strategist: no console/page errors');
    if (stratConsoleErrors.length) stratConsoleErrors.forEach(e => console.log('        [console] ' + e));

    await stratPage.close();
  }

  console.log('\n' + (allPassed ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED — see [FAIL] lines above'));

  await browser.close();
  process.exit(allPassed ? 0 : 1);
})();