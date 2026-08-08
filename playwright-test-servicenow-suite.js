const { chromium } = require('playwright');
const path = require('path');

// By default, looks for the 3 HTML files in the same folder as this script.
// Override with: node playwright-test-servicenow-suite.js /path/to/html/folder
const DIR = process.argv[2] || __dirname;

const FILES = {
  fundamentals: 'file://' + path.resolve(DIR, 'servicenow-fundamentals.html'),
  scenarios: 'file://' + path.resolve(DIR, 'servicenow-scenarios.html'),
  examsim: 'file://' + path.resolve(DIR, 'servicenow-exam-sim.html'),
};

let pass = 0, fail = 0;
const results = [];

function check(section, name, condition, detail) {
  const ok = !!condition;
  if (ok) pass++; else fail++;
  results.push({ section, name, ok, detail: detail || '' });
  console.log((ok ? 'PASS' : 'FAIL') + ' [' + section + '] ' + name + (detail ? ' — ' + detail : ''));
}

async function withPageErrors(page, section) {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  return errors;
}

async function testFundamentals(browser) {
  const section = 'FUNDAMENTALS';
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = await withPageErrors(page, section);

  await page.goto(FILES.fundamentals, { waitUntil: 'load' });
  await page.waitForTimeout(200);
  check(section, 'page loads with no console/page errors', errors.length === 0, errors.join(' | '));

  const tabCount = await page.locator('.module-tab').count();
  check(section, '6 module tabs render', tabCount === 6, 'found ' + tabCount);

  const firstActive = await page.locator('.module-panel.active').count();
  check(section, 'exactly one active panel on load', firstActive === 1);

  // click tab 3 and verify panel switch
  await page.locator('.module-tab').nth(2).click();
  await page.waitForTimeout(100);
  const activeTabIdx = await page.locator('.module-tab.active').first().innerText();
  check(section, 'clicking tab 3 activates it', activeTabIdx.trim().startsWith('3.'), 'active tab text: ' + activeTabIdx);

  // checklist toggle + progress bar
  const pctBefore = await page.locator('#progress-pct').innerText();
  const firstCheckbox = page.locator('.module-panel.active .check-item input').first();
  await firstCheckbox.check();
  await page.waitForTimeout(100);
  const pctAfter = await page.locator('#progress-pct').innerText();
  check(section, 'checking a box updates progress %', pctBefore !== pctAfter, pctBefore + ' -> ' + pctAfter);

  const doneClass = await page.locator('.module-panel.active .check-item').first().getAttribute('class');
  check(section, 'checked item gets "done" class (strikethrough)', doneClass.includes('done'));

  // localStorage persistence check
  const storedVal = await page.evaluate(() => localStorage.getItem('tsm_sn_009'));
  check(section, 'checkbox state persisted to localStorage', storedVal === '1', 'tsm_sn_009=' + storedVal);

  // reload and confirm persistence survives
  await page.reload();
  await page.waitForTimeout(150);
  await page.locator('.module-tab').nth(2).click();
  await page.waitForTimeout(100);
  const doneAfterReload = await page.locator('.module-panel.active .check-item').first().getAttribute('class');
  check(section, 'checked state survives page reload', doneAfterReload.includes('done'));

  // nav buttons: prev hidden on first module
  await page.locator('.module-tab').first().click();
  await page.waitForTimeout(100);
  const prevVisibility = await page.locator('#prev-btn').evaluate(el => getComputedStyle(el).visibility);
  check(section, 'PREVIOUS button hidden on first module', prevVisibility === 'hidden');

  // nav to last module, check button says FINISH
  await page.locator('.module-tab').last().click();
  await page.waitForTimeout(100);
  const nextBtnText = await page.locator('#next-btn').innerText();
  check(section, 'NEXT button reads FINISH on last module', nextBtnText.trim() === 'FINISH →', 'got: ' + nextBtnText);

  // footer links present
  const footerLinks = await page.locator('.footer-links a').count();
  check(section, 'footer has 3 links', footerLinks === 3, 'found ' + footerLinks);

  await ctx.close();
}

async function testScenarios(browser) {
  const section = 'SCENARIOS';
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = await withPageErrors(page, section);

  await page.goto(FILES.scenarios, { waitUntil: 'load' });
  await page.waitForTimeout(200);
  check(section, 'page loads with no console/page errors', errors.length === 0, errors.join(' | '));

  const scenarioIdx = await page.locator('#score-idx').innerText();
  check(section, 'scenario counter shows 1/5 on load', scenarioIdx.trim() === '1/5', 'got: ' + scenarioIdx);

  // answer all 5 scenarios, always picking the correct option, verify feedback + scoring
  for (let i = 0; i < 5; i++) {
    const options = page.locator('.sc-option');
    const optCount = await options.count();
    check(section, 'scenario ' + (i + 1) + ' has options rendered', optCount >= 2, 'count=' + optCount);

    // find and click the correct option based on rendered class after click; click first option, then inspect
    await options.first().click();
    await page.waitForTimeout(100);

    const feedbackVisible = await page.locator('#feedback').evaluate(el => el.classList.contains('show'));
    check(section, 'scenario ' + (i + 1) + ' shows feedback after picking', feedbackVisible);

    const disabledCount = await page.locator('.sc-option[disabled]').count();
    check(section, 'scenario ' + (i + 1) + ' disables options after answering', disabledCount === optCount, disabledCount + '/' + optCount);

    if (i < 4) {
      await page.locator('#next-btn').click();
      await page.waitForTimeout(150);
      const idxText = await page.locator('#score-idx').innerText();
      check(section, 'advancing shows scenario ' + (i + 2), idxText.trim() === (i + 2) + '/5', 'got: ' + idxText);
    } else {
      await page.locator('#next-btn').click();
      await page.waitForTimeout(150);
    }
  }

  const doneTitle = await page.locator('.dc-title').innerText().catch(() => null);
  check(section, 'completion card appears after 5th scenario', doneTitle && doneTitle.includes('COMPLETE'), 'got: ' + doneTitle);

  const scoreText = await page.locator('.dc-sub').innerText().catch(() => null);
  check(section, 'completion card shows a score summary', /\d+ of 5 correct/.test(scoreText || ''), 'got: ' + scoreText);

  // restart works
  await page.locator('.next-btn.show').click();
  await page.waitForTimeout(150);
  const idxAfterRestart = await page.locator('#score-idx').innerText();
  check(section, 'RUN AGAIN resets to scenario 1/5', idxAfterRestart.trim() === '1/5', 'got: ' + idxAfterRestart);

  const scoreValAfterRestart = await page.locator('#score-val').innerText();
  check(section, 'RUN AGAIN resets score to 0/0', scoreValAfterRestart.trim() === '0/0', 'got: ' + scoreValAfterRestart);

  await ctx.close();
}

async function testExamSim(browser) {
  const section = 'EXAM-SIM';
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = await withPageErrors(page, section);

  await page.goto(FILES.examsim, { waitUntil: 'load' });
  await page.waitForTimeout(200);
  check(section, 'page loads with no console/page errors', errors.length === 0, errors.join(' | '));

  const meta = await page.locator('.start-meta-val').allInnerTexts();
  check(section, 'start screen shows 15 / 15:00 / 70%', JSON.stringify(meta) === JSON.stringify(['15', '15:00', '70%']), 'got: ' + JSON.stringify(meta));

  await page.locator('.start-btn').click();
  await page.waitForTimeout(300);

  const qGridCount = await page.locator('.qgrid button').count();
  check(section, 'question grid has 15 entries after starting', qGridCount === 15, 'found ' + qGridCount);

  const timerText1 = await page.locator('#timer-val').innerText();
  await page.waitForTimeout(1300);
  const timerText2 = await page.locator('#timer-val').innerText();
  check(section, 'timer counts down', timerText1 !== timerText2, timerText1 + ' -> ' + timerText2);

  // answer question 1
  await page.locator('.sc-option').first().click();
  await page.waitForTimeout(100);
  const selectedClass = await page.locator('.sc-option.selected').count();
  check(section, 'selecting an option marks it selected', selectedClass === 1);

  const q1Answered = await page.locator('.qgrid button').nth(0).getAttribute('class');
  check(section, 'answered question marked in grid', q1Answered.includes('answered'));

  // prev button disabled on question 1
  const prevDisabled = await page.locator('.nav-btn').first().isDisabled();
  check(section, 'PREVIOUS disabled on question 1', prevDisabled);

  // jump through remaining questions and answer them all, then submit
  for (let i = 1; i < 15; i++) {
    await page.locator('.qgrid button').nth(i).click();
    await page.waitForTimeout(50);
    await page.locator('.sc-option').first().click();
    await page.waitForTimeout(50);
  }
  const answeredCount = await page.locator('.qgrid button.answered').count();
  check(section, 'all 15 questions answered', answeredCount === 15, 'answered=' + answeredCount);

  // go to last question, submit button should appear
  await page.locator('.qgrid button').nth(14).click();
  await page.waitForTimeout(100);
  const submitBtnText = await page.locator('.nav-btn.submit').innerText().catch(() => null);
  check(section, 'SUBMIT EXAM button appears on last question', submitBtnText === 'SUBMIT EXAM', 'got: ' + submitBtnText);

  page.once('dialog', d => d.accept());
  await page.locator('.nav-btn.submit').click();
  await page.waitForTimeout(300);

  const resultBanner = await page.locator('.rb-status').innerText().catch(() => null);
  check(section, 'results screen shows PASS or NOT YET banner', resultBanner === '✓ PASS' || resultBanner === '✗ NOT YET', 'got: ' + resultBanner);

  const reviewCount = await page.locator('.review-item').count();
  check(section, 'review shows all 15 questions', reviewCount === 15, 'found ' + reviewCount);

  const domainCells = await page.locator('.domain-cell').count();
  check(section, 'domain breakdown rendered', domainCells >= 1, 'found ' + domainCells);

  // retake generates a fresh exam
  await page.locator('.retake-row .start-btn').click();
  await page.waitForTimeout(300);
  const qGridCountAfterRetake = await page.locator('.qgrid button').count();
  check(section, 'retake returns to a fresh 15-question exam', qGridCountAfterRetake === 15, 'found ' + qGridCountAfterRetake);
  const answeredAfterRetake = await page.locator('.qgrid button.answered').count();
  check(section, 'retake resets all answers', answeredAfterRetake === 0, 'answered=' + answeredAfterRetake);

  await ctx.close();
}

async function testExamAutoSubmit(browser) {
  const section = 'EXAM-SIM (timeout)';
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = await withPageErrors(page, section);

  await page.goto(FILES.examsim, { waitUntil: 'load' });
  await page.locator('.start-btn').click();
  await page.waitForTimeout(200);

  // leave everything unanswered, fast-forward the shared top-level `secondsLeft` binding
  // to 1 second so the next 1s tick triggers the real auto-submit path (no confirm dialog expected)
  await page.evaluate(() => { secondsLeft = 1; });
  await page.waitForTimeout(1300);

  const resultBanner = await page.locator('.rb-status').innerText().catch(() => null);
  check(section, 'timer hitting 0 auto-submits to results without confirm', resultBanner === '✓ PASS' || resultBanner === '✗ NOT YET', 'got: ' + resultBanner);

  const scoreLine = await page.locator('.rb-score').innerText().catch(() => null);
  check(section, 'auto-submitted exam scores fully unanswered as 0 correct', /^0 \/ 15/.test(scoreLine || ''), 'got: ' + scoreLine);

  check(section, 'no console/page errors during auto-submit flow', errors.length === 0, errors.join(' | '));

  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  try {
    await testFundamentals(browser);
    await testScenarios(browser);
    await testExamSim(browser);
    await testExamAutoSubmit(browser);
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