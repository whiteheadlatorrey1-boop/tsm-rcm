#!/usr/bin/env node
/**
 * audit-verticals-puppeteer.js
 *
 * Puppeteer audit of the 8 core War Room -> Strategist -> Executive Portal
 * verticals documented in MASTER_VERTICAL_WALKTHROUGH.md:
 *   Healthcare, Construction, FinOps, Insurance, Legal (4-page chain),
 *   Real Estate, Mortgage, Schools.
 *
 * For each page:
 *   - loads it against a local server (default http://localhost:8080)
 *   - captures console errors/warnings, uncaught page errors, and failed
 *     network requests (404s, connection resets, CORS)
 *   - checks that every same-origin href/onclick-navigation on the page
 *     resolves to a real route on the running server (HEAD request)
 *   - takes a full-page screenshot
 *   - optionally clicks the primary chain-nav / escalate / export buttons
 *     named in MASTER_VERTICAL_WALKTHROUGH.md, if present, and records
 *     whether the click produced a JS error
 *
 * Usage:
 *   node server.js &                      # start the app locally first
 *   npm install puppeteer                 # already a package.json dep
 *   node audit-verticals-puppeteer.js [baseUrl]
 *
 * Default baseUrl: http://localhost:8080
 *
 * Output:
 *   ./audit-output-verticals/report.json
 *   ./audit-output-verticals/report.md
 *   ./audit-output-verticals/screenshots/*.png
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '');
const OUT_DIR = path.join(__dirname, 'audit-output-verticals');
const SHOT_DIR = path.join(OUT_DIR, 'screenshots');

// ---------------------------------------------------------------------------
// Vertical definitions, taken directly from MASTER_VERTICAL_WALKTHROUGH.md
// ---------------------------------------------------------------------------
const VERTICALS = [
  {
    name: 'Healthcare',
    pages: [
      { role: 'war-room', path: '/healthcare/hc-denial-war-room.html', clickSelectors: ['#escalate-strategist-btn'] },
      { role: 'strategist', path: '/healthcare/hc-main-strategist.html', clickSelectors: ['#strat-run-btn'] },
      { role: 'executive-portal', path: '/healthcare/executive-portal.html', clickSelectors: ['#tsmk-delivery-btn'] },
    ],
  },
  {
    name: 'Construction',
    pages: [
      { role: 'war-room', path: '/war-rooms/construct-war/construction-war-room.html', clickSelectors: ['#fireBtn'] },
      { role: 'strategist', path: '/war-rooms/construct-war/construction-strategist.html', clickSelectors: [] },
      { role: 'executive-portal', path: '/war-rooms/construct-war/construction-executive-portal.html', clickSelectors: ['#tsmk-delivery-btn'] },
    ],
  },
  {
    name: 'FinOps',
    pages: [
      { role: 'war-room', path: '/finops-suite/finops-war/finops-war-room.html', clickSelectors: ['#fireBtn'] },
      { role: 'strategist', path: '/finops-suite/finops-war/finops-main-strategist.html', clickSelectors: ['#genBtn'] },
      { role: 'executive-portal', path: '/finops-suite/finops-war/finops-executive-portal.html', clickSelectors: [] },
    ],
  },
  {
    name: 'Insurance',
    pages: [
      { role: 'war-room', path: '/war-rooms/insure-war/insurance-war-room.html', clickSelectors: ['#fireBtn'] },
      { role: 'strategist', path: '/war-rooms/insure-war/insurance-strategist.html', clickSelectors: ['#runBtn'] },
      { role: 'executive-portal', path: '/war-rooms/insure-war/insurance-executive-portal.html', clickSelectors: [] },
    ],
  },
  {
    name: 'Legal',
    pages: [
      { role: 'war-room', path: '/war-rooms/legal-war/legal-war-room.html', clickSelectors: [] },
      { role: 'case-strategist', path: '/legal-pro/case-strategist.html', clickSelectors: [] },
      { role: 'chief-strategist', path: '/war-rooms/legal-war/legal-main-strategist.html', clickSelectors: ['#escalate-btn'] },
      { role: 'executive-portal', path: '/war-rooms/legal-war/legal-executive-portal.html', clickSelectors: ['#tsmk-delivery-btn'] },
    ],
  },
  {
    name: 'Real Estate',
    pages: [
      { role: 'war-room', path: '/war-rooms/re-war/re-war-room.html', clickSelectors: [] },
      { role: 'strategist', path: '/war-rooms/re-war/re-strategist.html', clickSelectors: [] },
      { role: 'executive-portal', path: '/war-rooms/re-war/re-exec-portal.html', clickSelectors: [] },
    ],
  },
  {
    name: 'Mortgage',
    pages: [
      { role: 'war-room', path: '/war-rooms/mortgage/mortgage-war-room.html', clickSelectors: ['#btnLoadSample'] },
      { role: 'strategist', path: '/war-rooms/mortgage/mortgage-strategist.html', clickSelectors: [] },
      { role: 'executive-portal', path: '/war-rooms/mortgage/mortgage-executive-portal.html', clickSelectors: ['#tsmk-delivery-btn'] },
    ],
  },
  {
    name: 'Schools',
    pages: [
      { role: 'war-room', path: '/war-rooms/schools-command/schools-command.html', clickSelectors: [] },
      { role: 'strategist', path: '/war-rooms/schools-command/schools-strategist.html', clickSelectors: [] },
      { role: 'executive-portal', path: '/war-rooms/schools-command/schools-executive-portal.html', clickSelectors: ['#tsmk-delivery-btn'] },
    ],
  },
];

// Clicking is opt-in: it can trigger real exports/relay writes. Off by default.
const DO_CLICKS = process.argv.includes('--click');

function log(...args) {
  console.log(...args);
}

async function checkLinksOnPage(page, baseUrl) {
  const hrefs = await page.evaluate(() => {
    const out = new Set();
    document.querySelectorAll('a[href]').forEach((a) => {
      const h = a.getAttribute('href');
      if (h) out.add(h);
    });
    // Grab plain-string same-file navigation used in onclick="nav('x.html')" /
    // window.location.href='x.html' patterns too, best-effort via regex over
    // inline handler attributes.
    document.querySelectorAll('[onclick]').forEach((el) => {
      const oc = el.getAttribute('onclick') || '';
      const m = oc.match(/(?:nav|goNav|goto)\(['"]([^'"]+\.html[^'"]*)['"]\)/);
      if (m) out.add(m[1]);
      const m2 = oc.match(/location\.href\s*=\s*['"]([^'"]+\.html[^'"]*)['"]/);
      if (m2) out.add(m2[1]);
    });
    return Array.from(out);
  });

  const results = [];
  for (const href of hrefs) {
    if (/^(https?:)?\/\//i.test(href) && !href.includes(new URL(baseUrl).host)) continue; // external
    if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#') || href.startsWith('javascript:')) continue;
    let resolved;
    try {
      resolved = new URL(href, page.url()).toString();
    } catch {
      results.push({ href, status: 'unresolvable' });
      continue;
    }
    try {
      const resp = await page.evaluate(async (url) => {
        try {
          const r = await fetch(url, { method: 'HEAD' });
          return r.status;
        } catch (e) {
          return -1;
        }
      }, resolved);
      if (resp === -1 || resp >= 400) {
        results.push({ href, resolved, status: resp });
      }
    } catch {
      results.push({ href, resolved, status: 'fetch-error' });
    }
  }
  return results;
}

async function auditPage(browser, vertical, pageDef) {
  const url = BASE_URL + pageDef.path;
  const pageResult = {
    vertical: vertical.name,
    role: pageDef.role,
    path: pageDef.path,
    url,
    consoleErrors: [],
    consoleWarnings: [],
    pageErrors: [],
    failedRequests: [],
    brokenLinks: [],
    clicks: [],
    httpStatus: null,
    loadError: null,
  };

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'error') pageResult.consoleErrors.push(msg.text());
    if (type === 'warning') pageResult.consoleWarnings.push(msg.text());
  });
  page.on('pageerror', (err) => pageResult.pageErrors.push(String(err)));
  page.on('requestfailed', (req) => {
    pageResult.failedRequests.push({
      url: req.url(),
      reason: req.failure() ? req.failure().errorText : 'unknown',
    });
  });
  page.on('response', (resp) => {
    if (resp.url() === url) pageResult.httpStatus = resp.status();
    if (resp.status() >= 400 && resp.request().resourceType() !== 'document') {
      pageResult.failedRequests.push({ url: resp.url(), reason: `HTTP ${resp.status()}` });
    }
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (e) {
    pageResult.loadError = String(e);
    await page.close();
    return pageResult;
  }

  // Let any deferred relay/init scripts settle.
  await new Promise((r) => setTimeout(r, 1200));

  pageResult.brokenLinks = await checkLinksOnPage(page, BASE_URL);

  const safeName = `${vertical.name.replace(/\s+/g, '_')}__${pageDef.role}`.toLowerCase();
  await page.screenshot({ path: path.join(SHOT_DIR, `${safeName}.png`), fullPage: true });

  if (DO_CLICKS && pageDef.clickSelectors.length) {
    for (const sel of pageDef.clickSelectors) {
      const clickResult = { selector: sel, found: false, error: null };
      try {
        const el = await page.$(sel);
        clickResult.found = !!el;
        if (el) {
          const before = pageResult.pageErrors.length;
          await el.click({ delay: 50 }).catch((e) => { clickResult.error = String(e); });
          await new Promise((r) => setTimeout(r, 800));
          clickResult.newPageErrors = pageResult.pageErrors.slice(before);
        }
      } catch (e) {
        clickResult.error = String(e);
      }
      pageResult.clicks.push(clickResult);
    }
  }

  await page.close();
  return pageResult;
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });

  log(`Auditing ${VERTICALS.length} verticals against ${BASE_URL}${DO_CLICKS ? ' (clicks enabled)' : ' (clicks disabled — pass --click to enable)'}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const report = { baseUrl: BASE_URL, generatedAt: new Date().toISOString(), verticals: [] };

  for (const vertical of VERTICALS) {
    log(`\n=== ${vertical.name} ===`);
    const vResult = { name: vertical.name, pages: [] };
    for (const pageDef of vertical.pages) {
      process.stdout.write(`  ${pageDef.role.padEnd(20)} ${pageDef.path} ... `);
      const result = await auditPage(browser, vertical, pageDef);
      vResult.pages.push(result);
      const problems =
        (result.loadError ? 1 : 0) +
        result.consoleErrors.length +
        result.pageErrors.length +
        result.failedRequests.length +
        result.brokenLinks.length;
      log(problems === 0 ? 'OK' : `${problems} issue(s)`);
    }
    report.verticals.push(vResult);
  }

  await browser.close();

  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'report.md'), renderMarkdown(report));

  log(`\nDone. See ${OUT_DIR}/report.md and report.json`);
}

function renderMarkdown(report) {
  let md = `# Vertical Audit Report\n\nGenerated: ${report.generatedAt}\nBase URL: ${report.baseUrl}\n\n`;
  let totalIssues = 0;

  for (const v of report.verticals) {
    md += `## ${v.name}\n\n`;
    for (const p of v.pages) {
      const issues = [];
      if (p.loadError) issues.push(`**Load failed:** ${p.loadError}`);
      if (p.httpStatus && p.httpStatus >= 400) issues.push(`**HTTP ${p.httpStatus}** on page load`);
      if (p.consoleErrors.length) issues.push(`**${p.consoleErrors.length} console error(s):**\n` + p.consoleErrors.map((e) => `  - \`${e.slice(0, 200)}\``).join('\n'));
      if (p.pageErrors.length) issues.push(`**${p.pageErrors.length} uncaught page error(s):**\n` + p.pageErrors.map((e) => `  - \`${e.slice(0, 200)}\``).join('\n'));
      if (p.failedRequests.length) issues.push(`**${p.failedRequests.length} failed request(s):**\n` + p.failedRequests.map((r) => `  - \`${r.url}\` — ${r.reason}`).join('\n'));
      if (p.brokenLinks.length) issues.push(`**${p.brokenLinks.length} broken link(s):**\n` + p.brokenLinks.map((l) => `  - \`${l.href}\` → status ${l.status}`).join('\n'));
      if (p.clicks && p.clicks.length) {
        for (const c of p.clicks) {
          if (!c.found) issues.push(`**Click target not found:** \`${c.selector}\``);
          else if (c.error) issues.push(`**Click error on \`${c.selector}\`:** ${c.error}`);
          else if (c.newPageErrors && c.newPageErrors.length) issues.push(`**Click on \`${c.selector}\` triggered ${c.newPageErrors.length} error(s):**\n` + c.newPageErrors.map((e) => `  - \`${e.slice(0, 200)}\``).join('\n'));
        }
      }

      totalIssues += issues.length;
      md += `### ${p.role} — \`${p.path}\`\n\n`;
      md += issues.length ? issues.join('\n\n') + '\n\n' : '✅ Clean\n\n';
    }
  }

  md = `# Vertical Audit Report\n\nGenerated: ${report.generatedAt}\nBase URL: ${report.baseUrl}\n**Total issue groups: ${totalIssues}**\n\n` + md.split('\n\n').slice(1).join('\n\n');
  return md;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
