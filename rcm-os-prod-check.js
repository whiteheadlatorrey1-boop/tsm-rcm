// Prod readiness check: RCM OS + its 8 connected modules.
// Run with: node rcm-os-prod-check.js
// Requires: npm install puppeteer

const puppeteer = require('puppeteer');

const BASE = process.env.TSM_BASE_URL || 'https://tsm-consultz.fly.dev';

const PAGES = [
  { name: 'RCM OS',                path: '/html/finops-suite/tsm-rcm-os.html' },
  { name: 'RCM OS How-To',         path: '/html/finops-suite/tsm-rcm-os-howto.html' },
  { name: 'Branch Operations',     path: '/html/finops-suite/finops-operations.html' },
  { name: 'Accounting Ledger',     path: '/html/finops-suite/finops-accounting.html' },
  { name: 'Compliance Desk',       path: '/html/finops-suite/compliance.html' },
  { name: 'Scenario Modeling',     path: '/html/finops-suite/finops-scenarios.html' },
  { name: 'Financial Intelligence',path: '/html/finops-suite/finance-index.html' },
  { name: 'Document Search',       path: '/html/finops-suite/finops-showcase-v1.html' },
  { name: 'Vendor Situation Room', path: '/html/supplier-vendor/supplier-vendor-situation-room.html' },
  { name: 'Logistics Situation Room', path: '/html/logistics/logistics-situation-room.html' },
];

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
    try {
      hasEnforcer = await page.evaluate(() => typeof window.TSM_ENFORCER !== 'undefined');
      hasKernel = await page.evaluate(() => typeof window.TSM_KERNEL !== 'undefined');
    } catch (e) {}

    const title = await page.title().catch(() => '(no title)');

    results.push({ name, url, httpStatus, navError, title, hasEnforcer, hasKernel, consoleErrors, pageErrors, failedRequests });

    await page.close();
  }

  await browser.close();

  let anyFail = false;
  console.log('\n=== RCM OS Prod Readiness Report ===\n');
  for (const r of results) {
    const problems = [];
    if (r.navError) problems.push(`NAV ERROR: ${r.navError}`);
    if (r.httpStatus && r.httpStatus >= 400) problems.push(`HTTP ${r.httpStatus}`);
    if (!r.hasEnforcer) problems.push('window.TSM_ENFORCER missing');
    if (!r.hasKernel) problems.push('window.TSM_KERNEL missing');
    if (r.pageErrors.length) problems.push(`${r.pageErrors.length} uncaught JS error(s)`);
    if (r.consoleErrors.length) problems.push(`${r.consoleErrors.length} console.error(s)`);
    if (r.failedRequests.length) problems.push(`${r.failedRequests.length} failed/4xx+ request(s)`);

    const status = problems.length ? 'FAIL' : 'PASS';
    if (problems.length) anyFail = true;

    console.log(`[${status}] ${r.name}  (${r.url})`);
    console.log(`   title: ${r.title}   http: ${r.httpStatus}`);
    problems.forEach((p) => console.log(`   - ${p}`));
    r.pageErrors.forEach((e) => console.log(`     JS ERROR: ${e}`));
    r.consoleErrors.slice(0, 5).forEach((e) => console.log(`     console.error: ${e}`));
    r.failedRequests.slice(0, 10).forEach((e) => console.log(`     REQUEST: ${e}`));
    console.log('');
  }

  console.log(anyFail ? '=== RESULT: FAIL (see above) ===' : '=== RESULT: ALL PAGES CLEAN ===');
  process.exit(anyFail ? 1 : 0);
})();
