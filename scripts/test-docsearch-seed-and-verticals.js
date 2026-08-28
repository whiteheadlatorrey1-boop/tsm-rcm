// Regression test for two fixes to html/tsm-doc-search-multi.html:
//
// 1. seedAllVerticals() (the "Seed All Verticals" button) previously
//    referenced DEMO_RECORDS_BY_VERT, a variable never defined anywhere
//    in the file -- its own guard clause made every click a silent
//    no-op. Rebuilt to use the real DEMO_DOCS array via the same
//    per-client save path seedDemoData() already used correctly for a
//    single vertical, just looped across every real vertical key.
//
// 2. The 9 generic SAP-phase tabs (o2c, crm, approval, cpq, catalog,
//    mdm, governance, integration-hub, digital-twin) were removed from
//    both the VERTICALS registry and the visible tab bar -- this test
//    confirms they're actually gone and nothing else was.
//
// Requires a static file server for html/ to be running first, e.g.:
//   (python3 -m http.server 8931 &) ; node scripts/test-docsearch-seed-and-verticals.js
//
// Also requires Puppeteer with PUPPETEER_SKIP_DOWNLOAD=true npm install
// (see /home/claude cached Chrome path convention used elsewhere in this repo).

const puppeteer = require('puppeteer');

const CHROME_PATH = process.env.TSM_TEST_CHROME_PATH ||
  '/home/claude/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome';
const BASE_URL = process.env.TSM_TEST_BASE_URL || 'http://localhost:8931';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('OK:', msg);
  }
}

const REMOVED_SAP_KEYS = ['o2c', 'crm', 'approval', 'cpq', 'catalog', 'mdm', 'governance', 'integration-hub', 'digital-twin'];
const EXPECTED_REMAINING_KEYS = [
  'hw', 'fo', 'ins', 'con', 'bpo', 'logistics', 'vendor', 'hotel', 're',
  'mortgage', 'pm', 'noc', 'rcm-os', 'property-revenue', 'l1', 'schools',
  'leg', 'hc', 'bpo-ops',
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));

  await page.goto(`${BASE_URL}/html/tsm-doc-search-multi.html`, { waitUntil: 'networkidle0' });

  // ---- Part 1: SAP-phase tab removal ----
  const registryKeys = await page.evaluate(() => Object.keys(VERTICALS));
  assert(
    registryKeys.length === EXPECTED_REMAINING_KEYS.length &&
    EXPECTED_REMAINING_KEYS.every(k => registryKeys.includes(k)),
    `VERTICALS registry has exactly the 19 expected keys - got ${registryKeys.length}: ${registryKeys.join(',')}`
  );
  REMOVED_SAP_KEYS.forEach(k => {
    assert(!registryKeys.includes(k), `SAP-phase key '${k}' is removed from VERTICALS`);
  });

  const tabDataVs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.vtab')).map(b => b.dataset.v)
  );
  REMOVED_SAP_KEYS.forEach(k => {
    assert(!tabDataVs.includes(k), `SAP-phase tab button '${k}' is removed from the UI`);
  });
  assert(tabDataVs.includes('bpo-ops'),
    'bpo-ops tab is correctly KEPT (real industry vertical, not a SAP-phase tab)');
  // Note: 'noc' has no tab button in the UI at all -- pre-existing gap from
  // before this fix (same class of gap as rcm-os/property-revenue/l1, which
  // also lack tabs), not something this change removed or is responsible for.

  // ---- Part 2: seedAllVerticals() actually works now ----
  await page.evaluate(() => { seedAllVerticals(); });
  await new Promise(r => setTimeout(r, 200));

  const counts = await page.evaluate(() => {
    const out = {};
    Object.keys(VERTICALS).forEach(v => {
      switchVertical(v);
      out[v] = document.querySelectorAll('.doc-card').length;
    });
    return out;
  });

  // These are the verticals with real DEMO_DOCS coverage -- 10 already had
  // coverage before this fix, plus 6 that were zero-coverage gaps closed
  // in the same session (hw, logistics, vendor, pm, noc, schools). If this
  // list changes because someone adds/removes demo docs for a vertical,
  // update this expectation rather than treating it as a regression.
  const expectedNonZero = [
    'fo', 'ins', 'con', 'bpo', 'hotel', 're', 'mortgage', 'leg', 'hc', 'bpo-ops',
    'hw', 'logistics', 'vendor', 'pm', 'noc', 'schools',
  ];
  expectedNonZero.forEach(v => {
    assert(counts[v] > 0, `seedAllVerticals() populated '${v}' with ${counts[v]} real seeded cards`);
  });

  assert(pageErrors.length === 0, `no page errors during the full run - got: ${pageErrors.join('; ')}`);

  // ---- Part 3: a real seeded doc's View button actually opens the viewer ----
  await page.evaluate(() => { switchVertical('fo'); });
  const clickResult = await page.evaluate(() => {
    const btn = document.querySelector('.doc-card .btn-view');
    if (!btn) return { found: false };
    btn.click();
    const modal = document.getElementById('viewerModal');
    return {
      found: true,
      modalVisible: modal && modal.style.display === 'flex',
      hasTitle: !!(document.getElementById('viewerTitle') || {}).textContent,
    };
  });
  assert(clickResult.found, 'a real seeded doc card with a .btn-view button exists after seeding');
  assert(clickResult.modalVisible, 'clicking View actually opens the viewer modal (display:flex)');
  assert(clickResult.hasTitle, 'the opened viewer has real title content, not empty');

  console.log('\n' + (process.exitCode ? 'SMOKE TEST FAILED' : 'SMOKE TEST PASSED'));
  await browser.close();
})().catch(err => {
  console.error('ERROR', err);
  process.exit(1);
});
