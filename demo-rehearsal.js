#!/usr/bin/env node
/**
 * TSM ServiceNow BPO/MSP demo rehearsal (Playwright)
 *
 * Setup (once, in the Codespace):
 *   npm i -D playwright && npx playwright install --with-deps chromium
 *
 * Run (pick ONE credential):
 *   TSM_PASSWORD='<admin password>'   node demo-rehearsal.js
 *   TSM_ACCESS_CODE='<staff code>'    node demo-rehearsal.js
 *   TSM_COOKIE='<tsm_session value>'  node demo-rehearsal.js
 *
 * Options (env):
 *   BASE=https://tsm-shell.fly.dev   INCIDENT=INC0000055
 *   BLOCK_WRITES=1 (default)  POSTs to /api/bpo and /api/collective are logged
 *                             and answered with a stub, NOT sent to the server.
 *                             Set BLOCK_WRITES=0 to let the real ledger writes through.
 *   CLICK_APPROVE=1           also click APPROVE STRATEGY on the Executive page
 *   HEADED=1                  watch it run in a visible browser
 *
 * It never clicks: MARK EXECUTED, NOTIFY STAKEHOLDERS, ASSIGN OWNERS,
 * GENERATE LIVE EXECUTIVE BRIEF, or the SLA / CLIENT / ESCALATIONS tabs.
 *
 * Output: ./demo-run/*.png, ./demo-run/*.txt (page text), ./demo-run/report.json
 * Exit code 1 if any check FAILs.
 */
const { chromium, request } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = (process.env.BASE || 'https://tsm-shell.fly.dev').replace(/\/$/, '');
const INCIDENT = process.env.INCIDENT || 'INC0000055';
const OUT = process.env.OUT || path.join(process.cwd(), 'demo-run');
const BLOCK_WRITES = process.env.BLOCK_WRITES !== '0';
const CLICK_APPROVE = process.env.CLICK_APPROVE === '1';
const HEADED = process.env.HEADED === '1';

const WAR_ROOM = `${BASE}/html/war-rooms/bpo-war/bpo-war-room.html?servicenowIncident=${encodeURIComponent(INCIDENT)}`;

fs.mkdirSync(OUT, { recursive: true });

const results = [];
const timings = {};
const requests = [];      // every non-GET request seen
const pageErrors = [];    // console errors / uncaught exceptions
let currentBeat = 'setup';

function check(name, status, detail = '') {
  results.push({ beat: currentBeat, name, status, detail });
  const icon = { PASS: '✓', FAIL: '✗', WARN: '⚠', INFO: '·' }[status];
  console.log(`  ${icon} [${status}] ${name}${detail ? ' — ' + detail : ''}`);
}
function beat(name) { currentBeat = name; console.log(`\n=== ${name} ===`); }

async function timed(name, fn) {
  const t = Date.now();
  try { return await fn(); } finally { timings[name] = Math.round((Date.now() - t) / 1000); }
}

async function bodyText(page) {
  return page.evaluate(() => document.body.innerText);
}

function snippet(text, idx, span = 50) {
  return text.slice(Math.max(0, idx - span), idx + span).replace(/\s+/g, ' ');
}

async function login(context) {
  if (process.env.TSM_COOKIE) {
    await context.addCookies([{ name: 'tsm_session', value: process.env.TSM_COOKIE, url: BASE }]);
    return 'cookie-supplied';
  }
  const data = process.env.TSM_ACCESS_CODE
    ? { accessCode: process.env.TSM_ACCESS_CODE }
    : process.env.TSM_PASSWORD ? { password: process.env.TSM_PASSWORD } : null;
  if (!data) return null;
  const r = await context.request.post(`${BASE}/api/auth/login`, { data });
  const j = await r.json().catch(() => ({}));
  return r.ok() && j.ok ? (j.role || 'ok') : `login failed (HTTP ${r.status()})`;
}

async function preflight() {
  beat('PREFLIGHT');
  const anon = await request.newContext({ baseURL: BASE });
  const h = await anon.get('/health');
  check('/health returns 200', h.status() === 200 ? 'PASS' : 'FAIL', `HTTP ${h.status()}`);
  const u = await anon.get(`/api/l1-copilot/servicenow/bpo-intelligence?incident=${INCIDENT}`, { maxRedirects: 0 });
  check('ServiceNow route rejects unauthenticated caller', u.status() === 401 ? 'PASS' : 'FAIL', `HTTP ${u.status()}`);
  await anon.dispose();
}

async function main() {
  await preflight();

  const browser = await chromium.launch({ headless: !HEADED, slowMo: HEADED ? 250 : 0 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  const who = await login(context);
  if (!who || /failed/.test(who)) {
    check('login', 'FAIL', who || 'no credential in env (TSM_PASSWORD / TSM_ACCESS_CODE / TSM_COOKIE)');
    await browser.close();
    return finish();
  }
  check('login', 'PASS', String(who));
  if (['admin', 'manager', 'analyst'].includes(who)) check('session has an internal role', 'PASS', who);
  else if (who !== 'cookie-supplied') check('session has an internal role', 'FAIL', `role=${who}`);

  // Log every non-GET request; optionally stub ledger writes so a rehearsal writes nothing.
  await context.route('**/api/**', async (route) => {
    const req = route.request();
    if (req.method() === 'GET' || req.url().includes('/api/auth/')) return route.continue();
    let body = req.postData() || '';
    requests.push({ beat: currentBeat, method: req.method(), url: req.url().replace(BASE, ''), body: body.slice(0, 600), blocked: false });
    const isLedger = /\/api\/(bpo|collective|enterprise)\//.test(req.url());
    if (BLOCK_WRITES && isLedger) {
      requests[requests.length - 1].blocked = true;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, workItem: {} }) });
    }
    return route.continue();
  });

  const page = await context.newPage();
  page.on('pageerror', (e) => pageErrors.push({ beat: currentBeat, page: page.url().replace(BASE, ''), msg: String(e.message).slice(0, 200) }));
  page.on('console', (m) => {
    if (m.type() === 'error') pageErrors.push({ beat: currentBeat, page: page.url().replace(BASE, ''), msg: m.text().slice(0, 200) });
  });

  // ---------------- BEAT 2: SITUATION ROOM ----------------
  beat('1:00-2:30 SITUATION ROOM');
  await timed('situation-room-load', async () => {
    await page.goto(WAR_ROOM, { waitUntil: 'domcontentloaded' });
    try {
      await page.waitForFunction(() => /ServiceNow evidence loaded/i.test(document.body.innerText), null, { timeout: 30000 });
      check('ServiceNow evidence loaded (no intake error)', 'PASS');
    } catch {
      const t = await bodyText(page);
      check('ServiceNow evidence loaded (no intake error)', 'FAIL', snippet(t, Math.max(0, t.search(/status:/i)), 120));
    }
  });
  await page.waitForTimeout(1500); // let the quality card and cleanup block finish
  await page.screenshot({ path: path.join(OUT, '1-situation-room.png'), fullPage: true });
  const sr = await bodyText(page);
  fs.writeFileSync(path.join(OUT, '1-situation-room.txt'), sr);

  const clientVal = await page.evaluate(() => {
    const s = document.getElementById('tbClientSelect');
    return s ? { value: s.value, label: s.options[s.selectedIndex] && s.options[s.selectedIndex].text } : null;
  });
  check('client selector is Unassigned (Ziyad not inherited)', clientVal && clientVal.value === '' ? 'PASS' : 'FAIL', JSON.stringify(clientVal));
  check('root cause reads UNKNOWN / NOT ESTABLISHED', /UNKNOWN — NOT ESTABLISHED/i.test(sr) ? 'PASS' : 'FAIL');
  const notStated = (sr.match(/NOT STATED IN SOURCE DATA/g) || []).length;
  check('KPI tiles read NOT STATED IN SOURCE DATA (>=4)', notStated >= 4 ? 'PASS' : 'FAIL', `count=${notStated}`);
  for (const bad of ['DEPLETING', 'Calculating exposure', 'awaiting relay', '↑ CRITICAL', '↑ HIGH', 'UPLOADER']) {
    check(`template leftover gone: "${bad}"`, sr.includes(bad) ? 'FAIL' : 'PASS');
  }
  check('chain shows SERVICENOW · READ ONLY', /SERVICENOW · READ ONLY/.test(sr) ? 'PASS' : 'FAIL');
  check('risk panel has SOURCE-LINKED items', /SOURCE-LINKED/.test(sr) ? 'PASS' : 'FAIL');

  const q = {};
  const qm = sr.match(/TSM QUALITY SCORE\s*(\d+)%/i);
  q.overall = qm ? +qm[1] : null;
  for (const k of ['ACCURACY', 'COMPLETENESS', 'COMPLIANCE', 'CONFIDENCE']) {
    const m = sr.match(new RegExp(k + '\\s*(\\d+)%', 'i'));
    q[k.toLowerCase()] = m ? +m[1] : null;
  }
  check('quality card renders', q.overall != null ? 'PASS' : 'FAIL', JSON.stringify(q));
  check('Completeness is 100% (not_required excluded)', q.completeness === 100 ? 'PASS' : 'FAIL', `got ${q.completeness}`);
  check('Confidence is computed, not the old constant 60', q.confidence != null && q.confidence !== 60 ? 'PASS' : 'WARN', `got ${q.confidence}`);
  check('HITL line before routing (expected ⚠)', 'INFO', (sr.match(/([✓⚠—])\s*\n?\s*\[Compliance\] Recommendation routed/) || [, '?'])[1]);

  // ---------------- BEAT 4: STRATEGIST ----------------
  beat('4:00-5:30 STRATEGIST');
  await timed('route-to-strategist', async () => {
    await Promise.all([
      page.waitForURL(/bpo-strategist/, { timeout: 20000 }),
      page.locator('text=/ROUTE TO STRATEGIST/i >> visible=true').first().click(),
    ]);
  });
  check('reached Strategist page', 'PASS', page.url().replace(BASE, ''));
  await page.waitForTimeout(1500);

  const scenarioCards = await page.locator('.scenario-card').count();
  check('no generic scenario cards for a ServiceNow source', scenarioCards === 0 ? 'PASS' : 'WARN', `cards=${scenarioCards}`);

  await timed('generate-strategy-brief', async () => {
    await page.locator('#fireStratBtn').click();
    try {
      await page.waitForFunction(() => { const b = document.getElementById('escalateBtn'); return b && !b.disabled; }, null, { timeout: 120000 });
      check('brief generation finished, ESCALATE enabled', 'PASS');
    } catch {
      check('brief generation finished, ESCALATE enabled', 'FAIL', 'escalate button still disabled after 120s');
    }
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, '2-strategist.png'), fullPage: true });
  const st = await bodyText(page);
  fs.writeFileSync(path.join(OUT, '2-strategist.txt'), st);

  scanForInvention('Strategist', st);
  const hitl = (st.match(/([✓⚠—])\s*\n?\s*\[Compliance\] Recommendation routed/) || [, null])[1];
  check('HITL line after brief generated', hitl === '✓' ? 'PASS' : hitl ? 'WARN' : 'INFO',
    hitl ? `icon=${hitl}` : 'no quality card text found on Strategist');
  const gen = st.match(/TSM QUALITY SCORE\s*(\d+)%/i);
  check('Strategist quality card', gen ? 'INFO' : 'WARN',
    gen ? gen[1] + '%' : 'no quality card on Strategist (nothing recomputes there; HITL stays open)');

  // ---------------- BEAT 5: EXECUTIVE ----------------
  beat('5:30-7:00 EXECUTIVE');
  await timed('escalate-to-executive', async () => {
    await Promise.all([
      page.waitForURL(/bpo-executive-portal/, { timeout: 20000 }),
      page.locator('#escalateBtn').click(),
    ]);
  });
  check('reached Executive page', 'PASS', page.url().replace(BASE, ''));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, '3-executive.png'), fullPage: true });
  let ex = await bodyText(page);
  fs.writeFileSync(path.join(OUT, '3-executive.txt'), ex);

  scanForInvention('Executive', ex);
  check('Executive page shows this ServiceNow case (incident or PRB number)',
    (ex.includes(INCIDENT) || /PRB\d{7}/.test(ex)) ? 'PASS' : 'FAIL',
    'FAIL = exec page is not showing this ServiceNow case');
  check('Executive does not say RESOLVED for a live read-only incident',
    /■\s*RESOLVED\b/.test(ex) ? 'FAIL' : 'PASS');
  const foreign = [...ex.matchAll(/Cigna|BCBS|Claim AZ|write-off|HC Strategist/gi)];
  check('Executive shows no other cases\' data', foreign.length ? 'FAIL' : 'PASS',
    foreign.slice(0, 3).map((m) => `"${snippet(ex, m.index, 40)}"`).join(' | '));
  check('APPROVE STRATEGY control present', (await page.locator('.dc-btn.approve').count()) > 0 ? 'PASS' : 'FAIL');

  if (CLICK_APPROVE) {
    const before = requests.length;
    await page.locator('.dc-btn.approve').first().click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT, '4-executive-after-approve.png'), fullPage: true });
    ex = await bodyText(page);
    fs.writeFileSync(path.join(OUT, '4-executive-after-approve.txt'), ex);
    check('APPROVE STRATEGY click', 'INFO', `${requests.length - before} write request(s) fired; see report`);
  } else {
    check('APPROVE STRATEGY not clicked (CLICK_APPROVE=1 to test)', 'INFO');
  }

  // ---------------- CROSS-CUTTING ----------------
  beat('WRITE / READ-ONLY EVIDENCE');
  const snWrites = requests.filter((r) => /\/api\/l1-copilot\/servicenow/.test(r.url));
  check('no non-GET request to any ServiceNow route', snWrites.length === 0 ? 'PASS' : 'FAIL', snWrites.map((r) => r.method + ' ' + r.url).join('; '));
  const wi = requests.filter((r) => /\/api\/bpo\/work-items\//.test(r.url) && r.method === 'POST');
  for (const r of wi) {
    let j = null; try { j = JSON.parse(r.body); } catch { /* body truncated */ }
    const has = j && Object.prototype.hasOwnProperty.call(j, 'clientId');
    if (has) check(`work-item POST clientId (${r.beat})`, j.clientId === null ? 'PASS' : 'FAIL', String(j.clientId));
    else check(`work-item POST (${r.beat}) omits clientId`, 'INFO', 'server keeps existing value (sticky)');
  }
  check('page errors', pageErrors.length ? 'WARN' : 'PASS', pageErrors.length ? `${pageErrors.length}, see report` : '');

  await browser.close();
  finish();
}

function scanForInvention(label, text) {
  const money = [...text.matchAll(/\$\s?\d[\d,.]*\s?[KMB]?\b/g)];
  check(`${label}: no dollar figures (source states none)`, money.length ? 'FAIL' : 'PASS',
    money.slice(0, 5).map((m) => `"${snippet(text, m.index, 40)}"`).join(' | '));
  const soft = [...text.matchAll(/supplier|production line|revenue loss|SLA breach|clients? impacted/gi)]
    .filter((m) => !/NOT STATED/i.test(snippet(text, m.index, 60)));
  check(`${label}: no unsourced business claims`, soft.length ? 'WARN' : 'PASS',
    soft.slice(0, 4).map((m) => `"${snippet(text, m.index, 40)}"`).join(' | '));
}

function finish() {
  const fails = results.filter((r) => r.status === 'FAIL').length;
  const warns = results.filter((r) => r.status === 'WARN').length;
  const total = Object.values(timings).reduce((a, b) => a + b, 0);
  console.log(`\n=========== SUMMARY ===========`);
  console.log(`PASS ${results.filter((r) => r.status === 'PASS').length}  FAIL ${fails}  WARN ${warns}`);
  console.log(`Timings (s): ${JSON.stringify(timings)}  | automated steps total ≈ ${total}s (excludes your talking time)`);
  console.log(`BLOCK_WRITES=${BLOCK_WRITES ? 'on (ledger writes stubbed)' : 'off (ledger writes sent)'}`);
  if (requests.length) {
    console.log(`\nWrite requests seen (${requests.length}):`);
    for (const r of requests) {
      console.log(`  [${r.beat}] ${r.method} ${r.url}${r.blocked ? '  (stubbed)' : ''}`);
      if (/collective\/signal|capability-sweep/.test(r.url)) console.log('      body: ' + r.body.slice(0, 300));
    }
  }
  if (pageErrors.length) {
    console.log(`\nPage errors:`);
    for (const e of pageErrors.slice(0, 10)) console.log(`  [${e.page}] ${e.msg}`);
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ results, timings, requests, pageErrors }, null, 2));
  console.log(`\nArtifacts in ${OUT}/  (paste the FAIL/WARN lines and 2-strategist.txt / 3-executive.txt back to me)`);
  process.exitCode = fails ? 1 : 0;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });