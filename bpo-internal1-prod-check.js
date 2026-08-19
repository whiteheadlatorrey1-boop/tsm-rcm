// Prod readiness check: BPO Internal (bpo-internal1.html).
// Run with: node bpo-internal1-prod-check.js
// Requires: npm install puppeteer

const puppeteer = require('puppeteer');

const BASE = process.env.TSM_BASE_URL || 'https://app.tsmatter.com';

const PAGES = [
  { name: 'BPO Internal 1', path: '/bpo-files/bpo-internal1.html' },
];

// Known-benign noise -- adjust/extend if verification turns up more.
//   - favicon.ico 404: cosmetic, harmless everywhere.
const IGNORED_REQUEST_PATTERNS = [
  (entry) => /favicon\.ico/.test(entry) && /^404/.test(entry),
];

const IGNORED_CONSOLE_STATUSES = [404];

function filterRequests(list) {
  return list.filter((entry) => !IGNORED_REQUEST_PATTERNS.some((test) => test(entry)));
}

function filterConsoleErrors(list) {
  return list.filter((entry) => {
    const m = entry.match(/status of (\d+)/);
    return !(m && IGNORED_CONSOLE_STATUSES.includes(Number(m[1])));
  });
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results = [];

  for (const { name, path } of PAGES) {
    const url = BASE + path;
    const page = await browser.newPage();

    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });
    page.on('requestfailed', (req) => {
      failedRequests.push(`${req.method()} ${req.url()} -- ${req.failure()?.errorText}`);
    });
    page.on('response', (res) => {
      const status = res.status();
      if (status >= 400) {
        failedRequests.push(`${status} ${res.url()}`);
      }
    });

    let httpStatus = null;
    let navError = null;
    try {
      const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      httpStatus = response ? response.status() : null;
      await new Promise((r) => setTimeout(r, 1500));
    } catch (e) {
      navError = e.message;
    }

    let hasEnforcer = false;
    let hasKernel = false;
    let hasRelayCore = false;
    let hasMissionStore = false;
    try {
      hasEnforcer = await page.evaluate(() => typeof window.TSM_ENFORCER !== 'undefined');
      hasKernel = await page.evaluate(() => typeof window.TSM_KERNEL !== 'undefined');
      // Confirmed from source: relay.core.js sets window.TSM.relay;
      // mission-model.js sets window.TSMMissionModel; mission-store.js
      // sets window.TSMMissionStore (and depends on TSMMissionModel loading first).
      hasRelayCore = await page.evaluate(() =>
        typeof window.TSM !== 'undefined' && typeof window.TSM.relay !== 'undefined');
      hasMissionStore = await page.evaluate(() =>
        typeof window.TSMMissionModel !== 'undefined' && typeof window.TSMMissionStore !== 'undefined');
    } catch (e) {}

    const title = await page.title().catch(() => '(no title)');

    const filteredConsoleErrors = filterConsoleErrors(consoleErrors);
    const filteredFailedRequests = filterRequests(failedRequests);

    results.push({
      name, url, httpStatus, navError, title, hasEnforcer, hasKernel,
      hasRelayCore, hasMissionStore,
      consoleErrors: filteredConsoleErrors,
      pageErrors,
      failedRequests: filteredFailedRequests,
    });

    await page.close();
  }

  await browser.close();

  let anyFail = false;
  console.log('\n=== BPO Internal 1 Prod Readiness Report ===\n');
  for (const r of results) {
    const problems = [];
    if (r.navError) problems.push(`NAV ERROR: ${r.navError}`);
    if (r.httpStatus && r.httpStatus >= 400) problems.push(`HTTP ${r.httpStatus}`);
    if (!r.hasEnforcer) problems.push('window.TSM_ENFORCER missing');
    if (!r.hasKernel) problems.push('window.TSM_KERNEL missing');
    if (!r.hasRelayCore) problems.push('window.TSM.relay missing (relay.core.js not loaded/exposed)');
    if (!r.hasMissionStore) problems.push('window.TSMMissionModel / window.TSMMissionStore missing');
    if (r.pageErrors.length) problems.push(`${r.pageErrors.length} uncaught JS error(s)`);
    if (r.consoleErrors.length) problems.push(`${r.consoleErrors.length} console.error(s)`);
    if (r.failedRequests.length) problems.push(`${r.failedRequests.length} failed/4xx+ request(s)`);

    const status = problems.length ? 'FAIL' : 'PASS';
    if (problems.length) anyFail = true;

    console.log(`[${status}] ${r.name}  (${r.url})`);
    console.log(`   title: ${r.title}   http: ${r.httpStatus}`);
    problems.forEach((p) => console.log(`   - ${p}`));
    r.pageErrors.forEach((e) => console.log(`     JS ERROR: ${e}`));
    r.consoleErrors.slice(0, 10).forEach((e) => console.log(`     console.error: ${e}`));
    r.failedRequests.slice(0, 15).forEach((e) => console.log(`     REQUEST: ${e}`));
    console.log('');
  }

  console.log(anyFail ? '=== RESULT: FAIL (see above) ===' : '=== RESULT: ALL CLEAN ===');
  process.exit(anyFail ? 1 : 0);
})();