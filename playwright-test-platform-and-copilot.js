const { chromium } = require('playwright');
const path = require('path');

// By default, looks for the 2 HTML files in the same folder as this script.
// Override with: node playwright-test-platform-and-copilot.js /path/to/html/folder
const DIR = process.argv[2] || __dirname;

const FILES = {
  platform: 'file://' + path.resolve(DIR, 'tsm-career-training-platform.html'),
  copilot: 'file://' + path.resolve(DIR, 'l1-ticket-copilot.html'),
};

let pass = 0, fail = 0;
const results = [];

function check(section, name, condition, detail) {
  const ok = !!condition;
  if (ok) pass++; else fail++;
  results.push({ section, name, ok, detail: detail || '' });
  console.log((ok ? 'PASS' : 'FAIL') + ' [' + section + '] ' + name + (detail ? ' — ' + detail : ''));
}

function attachErrorCapture(page) {
  const pageErrors = [];
  const failedRequests = [];
  page.on('pageerror', err => pageErrors.push(err.message));
  page.on('requestfailed', req => failedRequests.push(req.url() + ' :: ' + (req.failure() && req.failure().errorText)));
  return { pageErrors, failedRequests };
}

async function testPlatform(browser) {
  const section = 'PLATFORM';
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const { pageErrors, failedRequests } = attachErrorCapture(page);

  await page.goto(FILES.platform, { waitUntil: 'load' });
  await page.waitForTimeout(300);

  check(section, 'no uncaught JS exceptions on load', pageErrors.length === 0, pageErrors.join(' | '));
  check(section, 'external tsm-runtime.js fails to load as expected (file:// has no server)', failedRequests.some(f => f.includes('tsm-runtime.js')), failedRequests.join(' | '));

  const tools = await page.locator('#h-tools').innerText();
  const certs = await page.locator('#h-certs').innerText();
  const sectors = await page.locator('#h-sectors').innerText();
  check(section, 'header stats render (23 tools / 7 certs / 7 sectors)', tools === '23' && certs === '7' && sectors === '7', `${tools}/${certs}/${sectors}`);

  // Completeness sweep: every nav item activates its matching panel, nothing else, no errors
  const navPanels = await page.locator('.nav-item[data-panel]').evaluateAll(els => els.map(e => e.getAttribute('data-panel')));
  check(section, 'found nav items to sweep', navPanels.length > 0, 'count=' + navPanels.length);

  let sweepOk = true, sweepDetail = '';
  for (const panelId of navPanels) {
    await page.locator(`.nav-item[data-panel="${panelId}"]`).click();
    await page.waitForTimeout(30);
    const activeCount = await page.locator('.panel.active').count();
    const activeId = await page.locator('.panel.active').getAttribute('id').catch(() => null);
    if (activeCount !== 1 || activeId !== 'panel-' + panelId) {
      sweepOk = false;
      sweepDetail += `[${panelId}: activeCount=${activeCount}, activeId=${activeId}] `;
    }
  }
  check(section, `all ${navPanels.length} nav items activate exactly their own panel`, sweepOk, sweepDetail);
  check(section, 'no uncaught JS exceptions during full nav sweep', pageErrors.length === 0, pageErrors.join(' | '));

  // ServiceNow panel: 24 study checks with correct sequential keys
  await page.locator('.nav-item[data-panel="servicenow"]').click();
  await page.waitForTimeout(100);
  const studyKeys = await page.locator('#panel-servicenow .study-check[data-key]').evaluateAll(els => els.map(e => e.getAttribute('data-key')));
  const expectedKeys = Array.from({ length: 24 }, (_, i) => 'tsm_sn_' + String(i + 1).padStart(3, '0'));
  check(section, '24 ServiceNow study checkboxes with correct sequential keys', JSON.stringify(studyKeys) === JSON.stringify(expectedKeys), 'found ' + studyKeys.length);

  // check one box, verify localStorage + global study progress bar update
  const pctBefore = await page.locator('#global-study-pct').innerText().catch(() => null);
  await page.locator('#panel-servicenow .study-check[data-key="tsm_sn_009"]').check();
  await page.waitForTimeout(100);
  const storedVal = await page.evaluate(() => localStorage.getItem('tsm_sn_009'));
  check(section, 'checking tsm_sn_009 writes "1" to the SAME key servicenow-fundamentals.html uses', storedVal === '1', 'got: ' + storedVal);
  const pctAfter = await page.locator('#global-study-pct').innerText().catch(() => null);
  check(section, 'global study progress % updates after checking a box', pctBefore !== pctAfter, `${pctBefore} -> ${pctAfter}`);

  // 3 correct suite links present with right hrefs
  const links = await page.locator('#panel-servicenow .cert-actions a.cert-btn').evaluateAll(els => els.map(e => e.getAttribute('href')));
  const expectedLinks = [
    '/html/l1-copilot/servicenow-exam-sim.html',
    '/html/l1-copilot/servicenow-scenarios.html',
    '/html/l1-copilot/servicenow-fundamentals.html'
  ];
  check(section, 'ServiceNow panel links to all 3 suite pages with correct hrefs', JSON.stringify(links) === JSON.stringify(expectedLinks), JSON.stringify(links));

  // footer nav buttons work (servicenow -> itsupport back, -> msai forward)
  await page.locator('#panel-servicenow .footer-btn', { hasText: '← IT SUPPORT' }).click();
  await page.waitForTimeout(80);
  let activeId = await page.locator('.panel.active').getAttribute('id');
  check(section, 'ServiceNow "← IT SUPPORT" footer button navigates correctly', activeId === 'panel-itsupport', 'got: ' + activeId);

  // IT Support panel has the L1 Ticket Copilot link
  const itsupportLink = await page.locator('#panel-itsupport a.app-card').first().getAttribute('href');
  check(section, 'IT Support panel links to l1-ticket-copilot.html', itsupportLink === '/html/l1-copilot/l1-ticket-copilot.html', 'got: ' + itsupportLink);

  await page.locator('#panel-itsupport .footer-btn', { hasText: 'SERVICENOW PREP →' }).click();
  await page.waitForTimeout(80);
  activeId = await page.locator('.panel.active').getAttribute('id');
  check(section, 'IT Support "SERVICENOW PREP →" footer button navigates correctly', activeId === 'panel-servicenow', 'got: ' + activeId);

  // HITL approve -> unlocks earning path
  await page.locator('.nav-item[data-panel="hitl"]').click();
  await page.waitForTimeout(80);
  const earningLockedBefore = await page.locator('#earning-lock').evaluate(el => getComputedStyle(el).display).catch(() => null);
  const approveBtn = page.locator('.hitl-card').first().locator('.hitl-btn.approve');
  await approveBtn.click();
  await page.waitForTimeout(80);
  await page.locator('.nav-item[data-panel="earning"]').click();
  await page.waitForTimeout(80);
  const earningLockedAfter = await page.locator('#earning-lock').evaluate(el => getComputedStyle(el).display);
  const earningUnlockedAfter = await page.locator('#earning-unlocked').evaluate(el => getComputedStyle(el).display);
  check(section, 'approving a HITL candidate unlocks the earning path', earningLockedAfter === 'none' && earningUnlockedAfter === 'block', `lock=${earningLockedAfter}, unlocked=${earningUnlockedAfter}`);

  // MSAI flashcard flip/next work without error
  await page.locator('.nav-item[data-panel="msai"]').click();
  await page.waitForTimeout(80);
  const flashcardExists = await page.locator('#msai-fc').count();
  if (flashcardExists > 0) {
    await page.locator('#msai-fc').click();
    await page.waitForTimeout(50);
    const flippedClass = await page.locator('#msai-fc').getAttribute('class');
    check(section, 'clicking the flashcard toggles the flipped class', flippedClass.includes('flipped'));
    await page.locator('.fc-btn', { hasText: 'NEXT →' }).click();
    await page.waitForTimeout(50);
    check(section, 'NEXT advances the flashcard without a page error', pageErrors.length === 0, pageErrors.join(' | '));
  } else {
    check(section, 'msai flashcard element found', false, 'not found — skipped flip/next test');
  }

  check(section, 'no uncaught JS exceptions across whole platform test', pageErrors.length === 0, pageErrors.join(' | '));

  await ctx.close();
}

async function testCopilot(browser) {
  const section = 'L1-COPILOT';
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const { pageErrors, failedRequests } = attachErrorCapture(page);

  await page.goto(FILES.copilot, { waitUntil: 'load' });
  await page.waitForTimeout(300);

  check(section, 'no uncaught JS exceptions on load', pageErrors.length === 0, pageErrors.join(' | '));

  // Completeness sweep of all sidebar sections
  const sectionNames = await page.locator('.sb-item[data-section]').evaluateAll(els => els.map(e => e.getAttribute('data-section')));
  check(section, 'found sidebar sections to sweep', sectionNames.length === 15, 'count=' + sectionNames.length);

  let sweepOk = true, sweepDetail = '';
  for (const name of sectionNames) {
    await page.locator(`.sb-item[data-section="${name}"]`).click();
    await page.waitForTimeout(30);
    const activeCount = await page.locator('.section.active').count();
    const activeId = await page.locator('.section.active').getAttribute('id').catch(() => null);
    if (activeCount !== 1 || activeId !== 'sec-' + name) {
      sweepOk = false;
      sweepDetail += `[${name}: activeCount=${activeCount}, activeId=${activeId}] `;
    }
  }
  check(section, `all ${sectionNames.length} sidebar items activate exactly their own section`, sweepOk, sweepDetail);

  // back to ticket section for the rest of the flow
  await page.locator('.sb-item[data-section="ticket"]').click();
  await page.waitForTimeout(80);

  // Load sample populates fields
  await page.locator('#btnLoadSample').click();
  await page.waitForTimeout(80);
  const incidentVal = await page.locator('#tkIncident').inputValue();
  check(section, 'Load Sample populates ticket fields', incidentVal === 'INC0012345', 'got: ' + incidentVal);

  // ticket autosave to localStorage + reload restores it
  const savedRaw = await page.evaluate(() => localStorage.getItem('TSM_L1_CURRENT_TICKET'));
  check(section, 'sample ticket autosaves to localStorage', !!savedRaw && JSON.parse(savedRaw).values.tkIncident === 'INC0012345');

  await page.reload();
  await page.waitForTimeout(200);
  const incidentAfterReload = await page.locator('#tkIncident').inputValue();
  check(section, 'ticket fields restore after reload (loadCurrentTicket)', incidentAfterReload === 'INC0012345', 'got: ' + incidentAfterReload);

  // Checklist: check an item, verify counts + notes sync
  await page.locator('.sb-item[data-section="troubleshoot"]').click();
  await page.waitForTimeout(80);
  const firstCheckbox = page.locator('#checklistBody input[type=checkbox]').first();
  await firstCheckbox.check();
  await page.waitForTimeout(80);
  const stepCountText = await page.locator('.checklist-step-head span').nth(1).innerText();
  check(section, 'checking a checklist item updates the step count', stepCountText.trim().startsWith('1/'), 'got: ' + stepCountText);

  await page.locator('.sb-item[data-section="notes"]').click();
  await page.waitForTimeout(80);
  const notesVal = await page.locator('#notesArea').inputValue();
  check(section, 'checked checklist item syncs into Notes', notesVal.includes('[x]'), 'got snippet: ' + notesVal.slice(0, 60));

  // SLA updates on priority change
  await page.locator('.sb-item[data-section="ticket"]').click();
  await page.waitForTimeout(50);
  await page.locator('#tkPriority').selectOption({ index: 0 });
  const priorityVal = await page.locator('#tkPriority').inputValue();
  await page.locator('.sb-item[data-section="sla"]').click();
  await page.waitForTimeout(80);
  const slaPriorityText = await page.locator('#slaPriority').innerText();
  check(section, 'SLA section reflects the selected priority', slaPriorityText === priorityVal, `sla=${slaPriorityText}, ticket=${priorityVal}`);

  // Run Analysis with no backend present — should fail gracefully, not crash
  await page.locator('.sb-item[data-section="ticket"]').click();
  await page.waitForTimeout(50);
  await page.locator('#btnAnalyze').click();
  await page.waitForTimeout(400);
  const aiOutputText = await page.locator('#aiOutput').innerText();
  check(section, 'Run Analysis without backend fails gracefully (caught, not thrown)', /analysis failed/i.test(aiOutputText), 'got: ' + aiOutputText.slice(0, 100));
  check(section, 'no uncaught JS exception from the failed analysis call', pageErrors.length === 0, pageErrors.join(' | '));

  // Floating AI assistant FAB opens/closes and fails gracefully on submit
  const fabExists = await page.locator('#l1a-fab').count();
  if (fabExists > 0) {
    await page.locator('#l1a-fab').click();
    await page.waitForTimeout(80);
    const panelOpen = await page.locator('#l1a-panel').evaluate(el => el.classList.contains('l1a-open'));
    check(section, 'AI assistant FAB opens the panel', panelOpen);

    await page.locator('#l1a-input').fill('Laptop will not boot, no POST beeps.');
    await page.locator('#l1a-send').click();
    await page.waitForTimeout(400);
    const answerText = await page.locator('#l1a-answer').innerText();
    check(section, 'FAB assistant fails gracefully without backend (caught, not thrown)', /could not reach the assistant/i.test(answerText), 'got: ' + answerText.slice(0, 100));

    await page.locator('#l1a-close').click();
    await page.waitForTimeout(80);
    const panelClosed = await page.locator('#l1a-panel').evaluate(el => !el.classList.contains('l1a-open'));
    check(section, 'AI assistant FAB closes the panel', panelClosed);
  } else {
    check(section, 'AI assistant FAB found', false, 'not found — skipped');
  }

  // Clear ticket resets fields
  await page.locator('.sb-item[data-section="ticket"]').click();
  await page.waitForTimeout(50);
  await page.locator('#btnClearTicket').click();
  await page.waitForTimeout(80);
  const incidentAfterClear = await page.locator('#tkIncident').inputValue();
  check(section, 'Clear Ticket empties the incident field', incidentAfterClear === '', 'got: ' + JSON.stringify(incidentAfterClear));
  const savedAfterClear = await page.evaluate(() => localStorage.getItem('TSM_L1_CURRENT_TICKET'));
  check(section, 'Clear Ticket wipes the autosave key', savedAfterClear === null, 'got: ' + savedAfterClear);

  check(section, 'no uncaught JS exceptions across whole copilot test', pageErrors.length === 0, pageErrors.join(' | '));
  check(section, 'expected external script 404s only (no unexpected failed requests)',
    failedRequests.every(f => /relay\.core\.js|tsm-event-bus\.js|tsm-state\.js|tsm-mission-engine\.js|tsm-auto-pipeline\.js|tsm-runtime\.js|\/api\/l1-copilot\//.test(f)),
    failedRequests.join(' | '));

  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  try {
    await testPlatform(browser);
    await testCopilot(browser);
  } catch (e) {
    console.error('RUNNER ERROR:', e);
    fail++;
  } finally {
    await browser.close();
  }

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  if (fail > 0) {
    console.log('\nFailed checks:');
    results.filter(r => !r.ok).forEach(r => console.log(' - [' + r.section + '] ' + r.name + (r.detail ? ' (' + r.detail + ')' : '')));
    process.exitCode = 1;
  }
})();