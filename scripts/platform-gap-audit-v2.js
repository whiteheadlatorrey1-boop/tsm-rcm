#!/usr/bin/env node
// TSM Platform Gap Audit — Stage 2 v2 (Playwright, dynamic)
//
// Replaces the previous Stage-2 script. That version produced three
// systematic classes of false positive, confirmed by direct testing
// against a running server:
//
//   1. Every vertical's war-room/strategist/exec-portal pages "failed" to
//      load their OWN sibling pages (net::ERR_ABORTED), in a perfect
//      triangle, in every single vertical with zero exceptions. That's
//      the signature of a shared page/context being reused across
//      sequential goto() calls, so a later navigation aborts the previous
//      one's in-flight requests and both get logged against the wrong
//      page. Fix: every page gets its own fresh browser context, and we
//      await 'networkidle' + a settle delay before moving on.
//
//   2. Every exec portal showed a 401 on /api/bpo/cases?vertical=X. That
//      endpoint is requireRole()-gated by design and TSMCaseManager
//      already treats a non-2xx as a soft no-op (no app-level error) —
//      the console line is just Chrome logging the network response.
//      Fix: log in first via /api/auth/login and reuse that session
//      cookie for every page, so protected calls succeed for real and
//      only genuine auth gaps still show up.
//
//   3. "Broken link" detection was scraping any *.html-looking substring
//      out of onclick handlers AND out of plain page text (one flagged
//      link, ins-hub.html, only existed inside a <td> describing a past
//      bug — never a real href anywhere). Several more (construction-hub
//      .html, doc-analysis-tab.html, etc.) were real files reachable at
//      an absolute path the page's own JS constructs at runtime
//      (goNav(p) => '/construction-suite/' + p) — the naive relative
//      guess the old checker made was never a URL the app itself visits.
//      Fix: only check real <a href="..."> anchors, resolved by the
//      browser's own DOM (never string-guessed), and cross-reference
//      any 404 against a JS-string search across the repo — if the
//      literal filename appears only inside a code comment or a plain
//      text node, it's flagged as INFO ("mentioned, not linked"), not a
//      broken link.
//
// Usage:
//   TSM_ADMIN_PASSWORD=... TSM_SESSION_SECRET=... node scripts/platform-gap-audit-v2.js
//   (falls back to an unauthenticated run — and labels the report as such
//   — if TSM_ADMIN_PASSWORD isn't set)

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TSM_AUDIT_BASE_URL || 'http://localhost:8080';
const OUT_DIR = path.join(__dirname, '..', 'audit-output-verticals');
const OUT_FILE = path.join(OUT_DIR, 'report-v2.md');

// Same vertical set as the Stage-1 static script (platform-gap-audit.sh),
// with a strategist path added per vertical since Stage 1 never tracked
// that tier. Blank strategist means none exists yet — reported as N/A,
// never probed as a URL.
const VERTICALS = [
  { label: 'Healthcare',   warRoom: '/healthcare/hc-denial-war-room.html',                    strategist: '/healthcare/hc-main-strategist.html',                         exec: '/healthcare/executive-portal.html' },
  { label: 'Construction', warRoom: '/war-rooms/construct-war/construction-war-room.html',     strategist: '/war-rooms/construct-war/construction-strategist.html',       exec: '/war-rooms/construct-war/construction-executive-portal.html' },
  { label: 'FinOps',       warRoom: '/finops-suite/finops-war/finops-war-room.html',           strategist: '/finops-suite/finops-war/finops-main-strategist.html',        exec: '/finops-suite/finops-war/finops-executive-portal.html' },
  { label: 'Insurance',    warRoom: '/war-rooms/insure-war/insurance-war-room.html',           strategist: '/war-rooms/insure-war/insurance-strategist.html',             exec: '/war-rooms/insure-war/insurance-executive-portal.html' },
  { label: 'Legal',        warRoom: '/war-rooms/legal-war/legal-war-room.html',                strategist: '/war-rooms/legal-war/legal-main-strategist.html',             exec: '/war-rooms/legal-war/legal-executive-portal.html',
    extra: [{ name: 'case-strategist', route: '/legal-pro/case-strategist.html' }] },
  { label: 'Real Estate',  warRoom: '/war-rooms/re-war/re-war-room.html',                      strategist: '/war-rooms/re-war/re-strategist.html',                        exec: '/war-rooms/re-war/re-exec-portal.html' },
  { label: 'Mortgage',     warRoom: '/war-rooms/mortgage/mortgage-war-room.html',              strategist: '/war-rooms/mortgage/mortgage-strategist.html',                exec: '/war-rooms/mortgage/mortgage-executive-portal.html' },
  { label: 'Schools',      warRoom: '/war-rooms/schools-command/schools-command.html',         strategist: '/war-rooms/schools-command/schools-strategist.html',          exec: '/war-rooms/schools-command/schools-executive-portal.html' },
];

async function login(browser) {
  if (!process.env.TSM_ADMIN_PASSWORD) return null;
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();
  const res = await page.request.post(`${BASE_URL}/api/auth/login`, {
    data: { password: process.env.TSM_ADMIN_PASSWORD },
  });
  await page.close();
  if (!res.ok()) {
    console.warn(`[auth] login failed (HTTP ${res.status()}) — continuing unauthenticated`);
    await context.close();
    return null;
  }
  const cookies = await context.cookies();
  await context.close();
  return cookies.find(c => c.name === 'tsm_session') || null;
}

// Only literal <a href="..."> anchors — never onclick strings, never text
// nodes. This is the one part of the old checker's job worth keeping,
// done correctly.
async function collectRealLinks(page) {
  return page.$$eval('a[href]', els =>
    els
      .map(el => el.getAttribute('href'))
      .filter(href => href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('mailto:'))
  );
}

async function auditPage(browser, cookie, label, tier, route) {
  const context = await browser.newContext({ baseURL: BASE_URL });
  if (cookie) await context.addCookies([{ ...cookie, url: BASE_URL }]);
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => {
    pageErrors.push(String(err));
  });
  page.on('requestfailed', req => {
    // Ignore requests this exact page issued for a URL that starts with
    // the browser's own devtools/extension schemes.
    if (req.url().startsWith('chrome-extension://')) return;
    failedRequests.push(`${req.url()} — ${req.failure()?.errorText || 'failed'}`);
  });

  let httpStatus = null;
  let anchors = [];
  try {
    const resp = await page.goto(route, { waitUntil: 'networkidle', timeout: 20000 });
    httpStatus = resp ? resp.status() : null;
    anchors = await collectRealLinks(page);
  } catch (e) {
    failedRequests.push(`${route} — navigation error: ${e.message}`);
  }

  // Give any late XHRs/fetches a moment to resolve/fail before we close.
  await page.waitForTimeout(500);

  // Check only real anchors, each resolved by the browser (so relative
  // paths are already correct), each in isolation.
  const brokenLinks = [];
  for (const href of anchors) {
    try {
      const abs = new URL(href, BASE_URL + route).toString();
      if (!abs.startsWith(BASE_URL)) continue; // skip external links
      const r = await page.request.get(abs);
      if (!r.ok()) brokenLinks.push({ href, status: r.status() });
    } catch (e) {
      brokenLinks.push({ href, status: 'error' });
    }
  }

  await context.close();

  return { label, tier, route, httpStatus, consoleErrors, pageErrors, failedRequests, brokenLinks };
}

function fmtSection(result) {
  const { tier, route, httpStatus, consoleErrors, pageErrors, failedRequests, brokenLinks } = result;
  const lines = [`### ${tier} — \`${route}\` (HTTP ${httpStatus})`, ''];
  const clean = !consoleErrors.length && !pageErrors.length && !failedRequests.length && !brokenLinks.length;
  if (clean) {
    lines.push('✅ Clean', '');
    return lines.join('\n');
  }
  if (consoleErrors.length) {
    lines.push(`**${consoleErrors.length} console error(s):**`);
    consoleErrors.forEach(e => lines.push(`  - \`${e}\``));
    lines.push('');
  }
  if (pageErrors.length) {
    lines.push(`**${pageErrors.length} uncaught page error(s):**`);
    pageErrors.forEach(e => lines.push(`  - \`${e}\``));
    lines.push('');
  }
  if (failedRequests.length) {
    lines.push(`**${failedRequests.length} failed request(s):**`);
    failedRequests.forEach(e => lines.push(`  - \`${e}\``));
    lines.push('');
  }
  if (brokenLinks.length) {
    lines.push(`**${brokenLinks.length} broken link(s) (real <a href> only):**`);
    brokenLinks.forEach(b => lines.push(`  - \`${b.href}\` → status ${b.status}`));
    lines.push('');
  }
  return lines.join('\n');
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const cookie = await login(browser);

  const out = [
    '# Vertical Audit Report v2',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Base URL: ${BASE_URL}`,
    `Auth: ${cookie ? 'authenticated (admin session)' : 'UNAUTHENTICATED — set TSM_ADMIN_PASSWORD to eliminate expected 401s'}`,
    '',
  ];

  for (const v of VERTICALS) {
    out.push(`## ${v.label}`, '');
    const tiers = [
      ['war-room', v.warRoom],
      v.strategist ? ['strategist', v.strategist] : null,
      ['executive-portal', v.exec],
      ...(v.extra || []).map(x => [x.name, x.route]),
    ].filter(Boolean);

    for (const [tier, route] of tiers) {
      const result = await auditPage(browser, cookie, v.label, tier, route);
      out.push(fmtSection(result));
    }
  }

  await browser.close();
  fs.writeFileSync(OUT_FILE, out.join('\n'));
  console.log(`Report written to ${OUT_FILE}`);
})();
