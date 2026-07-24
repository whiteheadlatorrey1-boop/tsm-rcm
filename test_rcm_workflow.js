const puppeteer = require('puppeteer');

const BASE = 'http://localhost:8791';
const results = [];
let pass = 0, fail = 0;

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} — ${detail || ''}`); }
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/home/codespace/.cache/puppeteer/chrome/linux-150.0.7871.24/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // ---------- PAGE 1: tsm-rcm-os.html ----------
  console.log('\n=== tsm-rcm-os.html ===');
  const page1 = await browser.newPage();
  const consoleErrors1 = [];
  page1.on('console', msg => { if (msg.type() === 'error') consoleErrors1.push(msg.text()); });
  page1.on('pageerror', err => consoleErrors1.push('pageerror: ' + err.message));

  const resp1 = await page1.goto(`${BASE}/tsm-rcm-os.html`, { waitUntil: 'networkidle0', timeout: 30000 });
  record('page loads (HTTP 200)', resp1.status() === 200, `status ${resp1.status()}`);

  const title1 = await page1.title();
  record('title correct', title1.includes('RCM OS'), `got "${title1}"`);

  record('no console/page errors on load', consoleErrors1.length === 0, consoleErrors1.join(' | '));

  // Check the how-to link exists and points to the right file
  const howtoLinkHref = await page1.$eval('a.back-link[href*="howto"]', el => el.getAttribute('href')).catch(() => null);
  record('How-To Guide link present', howtoLinkHref === 'tsm-rcm-os-howto.html', `got ${howtoLinkHref}`);

  // Check for the exposure/impact related IDs if present (from earlier fix context)
  const bodyText1 = await page1.evaluate(() => document.body.innerText.length);
  record('page has rendered visible content', bodyText1 > 500, `innerText length ${bodyText1}`);

  // Check localStorage fallback mechanism mentioned in howto is at least referenced consistently
  const hasLocalStorageUsage = await page1.evaluate(() => {
    return document.documentElement.outerHTML.includes('localStorage');
  });
  record('localStorage fallback code present (per how-to description)', hasLocalStorageUsage, 'no localStorage reference found in page source');

  // ---------- Click through to How-To guide ----------
  console.log('\n=== Navigating tsm-rcm-os.html → How-To Guide ===');
  await Promise.all([
    page1.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => null),
    page1.click('a.back-link[href*="howto"]')
  ]);
  // Since target=_blank, this may open a new tab instead of navigating. Handle both.
  let howtoPage = page1;
  const pages = await browser.pages();
  if (pages.length > 2) {
    howtoPage = pages[pages.length - 1];
    await howtoPage.waitForSelector('body', { timeout: 10000 }).catch(() => null);
  }
  const howtoUrl = howtoPage.url();
  record('link opens tsm-rcm-os-howto.html', howtoUrl.includes('tsm-rcm-os-howto.html'), `landed on ${howtoUrl}`);

  // ---------- PAGE 2: tsm-rcm-os-howto.html (fresh load for isolated tests) ----------
  console.log('\n=== tsm-rcm-os-howto.html ===');
  const page2 = await browser.newPage();
  const consoleErrors2 = [];
  page2.on('console', msg => { if (msg.type() === 'error') consoleErrors2.push(msg.text()); });
  page2.on('pageerror', err => consoleErrors2.push('pageerror: ' + err.message));

  const resp2 = await page2.goto(`${BASE}/tsm-rcm-os-howto.html`, { waitUntil: 'networkidle0', timeout: 30000 });
  record('page loads (HTTP 200)', resp2.status() === 200, `status ${resp2.status()}`);
  record('no console/page errors on load', consoleErrors2.length === 0, consoleErrors2.join(' | '));

  // Back link to RCM OS
  const backHref = await page2.$eval('a.back-link[href="tsm-rcm-os.html"]', el => el.getAttribute('href')).catch(() => null);
  record('Back to RCM OS link present', backHref === 'tsm-rcm-os.html', `got ${backHref}`);

  // FAQ render + toggle interactivity
  const faqCount = await page2.$$eval('.faq-item', els => els.length);
  record('FAQ items rendered', faqCount === 10, `found ${faqCount}, expected 10`);

  const firstFaqOpenBefore = await page2.$eval('.faq-item[data-i="0"]', el => el.classList.contains('open'));
  await page2.click('.faq-item[data-i="0"] .faq-q');
  const firstFaqOpenAfter = await page2.$eval('.faq-item[data-i="0"]', el => el.classList.contains('open'));
  record('FAQ toggle works on click', firstFaqOpenBefore === false && firstFaqOpenAfter === true, `before=${firstFaqOpenBefore} after=${firstFaqOpenAfter}`);

  // TOC scrollspy: check links exist and point to real section IDs
  const tocCheck = await page2.evaluate(() => {
    const links = Array.from(document.querySelectorAll('.toc-link'));
    const missing = [];
    links.forEach(l => {
      const id = l.getAttribute('href').replace('#', '');
      if (!document.getElementById(id)) missing.push(id);
    });
    return { total: links.length, missing };
  });
  record('all TOC links resolve to real section IDs', tocCheck.missing.length === 0, `missing: ${tocCheck.missing.join(', ')}`);

  // Scroll to trigger scrollspy active state change
  const relaySection = await page2.$('#relay');
  if (relaySection) {
    await page2.evaluate(() => document.getElementById('relay').scrollIntoView());
    await new Promise(r => setTimeout(r, 300));
    const activeAfterScroll = await page2.$eval('.toc-link.active', el => el.getAttribute('href')).catch(() => null);
    record('scrollspy updates active TOC link on scroll', activeAfterScroll !== null, `active link: ${activeAfterScroll}`);
  } else {
    record('#relay section exists for scrollspy test', false, 'section not found');
  }

  // Data intake anchor referenced from the RCM OS relay steps
  const relayExists = await page2.$('#relay') !== null;
  record('#relay (Data Intake) anchor exists', relayExists);

  // Glossary/GL account table sanity check
  const glRows = await page2.$$eval('.gl-table tbody tr', rows => rows.length);
  record('GL account table populated', glRows === 13, `found ${glRows} rows, expected 13`);

  await browser.close();

  console.log(`\n=== SUMMARY: ${pass} passed, ${fail} failed (of ${pass + fail}) ===`);
  process.exit(fail > 0 ? 1 : 0);
})();
