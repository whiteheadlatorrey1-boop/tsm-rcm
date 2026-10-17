#!/usr/bin/env node
// capture-construct-war-flagship.js — fail-loud capture of the Construction recovery flow.
//
//   node tests/e2e/demo/capture-construct-war-flagship.js   (server must be running;
//   make-construct-war-flagship.sh starts one with a throwaway audit directory)
//
// Walks the real recovery tab through the real routes, with seeded sample data:
//   1-2. war room -> Recovery tab (inside the war room's iframe)
//   3.   the same page at full size: KPIs
//   4-6. recovery plan, ranked exposures, pending change orders (spotlighted)
//   7.   a draft for review         8-9. two-click accept, decision + audit
//   10-11. override blocked (short reason), then recorded with a real reason
//   12.  the audit trail
//
// Refuses to run against a real deployment, and refuses to start if the server
// already holds decisions or audit entries (rehearsals would show in the video).
// Decision state is in memory and the audit directory is the wrapper's, so a
// fresh server is always a clean slate.

if (process.env.NODE_ENV === 'production' || process.env.FLY_APP_NAME) {
  console.error('Refusing to run: this looks like a real deployment (NODE_ENV=production or FLY_APP_NAME set).');
  process.exit(1);
}

const { chromium } = require('playwright');
const path = require('path');
const { createCapture } = require('../helpers/demo-step.js');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const PASS = process.env.TSM_LOGIN_PASSWORD || 'dev';
const OUT = path.join(__dirname, 'screenshots', 'construct-war-flagship');
const SIDECAR = path.join(__dirname, 'construct-war-capture.json'); // name picked up by render-from-manifest.js so the quality gate's sensitive-data scan runs
const EXPECTED_FRAMES = 12;

const co = (id) => `.co:has-text("${id}")`;
const NOTE_SHORT = 'ok';
const NOTE_REAL = 'Owner agreed to fund this item under the amended contract';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  // '.audit .err' is the only on-screen error that is never expected. The blocked-override
  // message is expected on purpose, so it is asserted by text in its own step instead.
  const { step, writeSidecar, pageErrors } = createCapture({
    page, browser, outDir: OUT, base: BASE,
    errSelector: '.audit .err',
    errRe: /(failed|not recorded|sign in required|could not load|unauthori[sz]ed|not defined|is not a function)/i,
  });

  const stop = async (why) => { console.error('✗ ' + why); await browser.close(); process.exit(1); };

  const lr = await page.request.post(BASE + '/api/auth/login', { data: { password: PASS } });
  if (!lr.ok()) return stop('admin login failed: HTTP ' + lr.status());

  // clean-slate guard
  const rec = await page.request.get(BASE + '/api/construction/recovery');
  if (!rec.ok()) return stop('GET /api/construction/recovery failed: HTTP ' + rec.status());
  const recJson = await rec.json();
  if (recJson.changeOrders.some((c) => c.decision)) return stop('the server already holds decisions; restart it (decision state is in memory) before capturing');
  const aud = await page.request.get(BASE + '/api/construction/audit');
  if (!aud.ok()) return stop('GET /api/construction/audit failed: HTTP ' + aud.status());
  if ((await aud.json()).count !== 0) return stop('the audit trail is not empty; point CONSTRUCTION_AUDIT_DIR at an empty directory');
  console.log('Admin logged in, clean slate confirmed. Capturing to ' + OUT);

  // outline a panel so each frame has a clear subject (also makes same-page frames differ)
  const spot = (sel) => page.evaluate((s) => {
    document.querySelectorAll('[data-spot]').forEach((e) => { e.style.outline = ''; e.removeAttribute('data-spot'); });
    const el = document.querySelector(s);
    const panel = (el && el.closest('.panel')) || el;
    if (!panel) throw new Error('nothing to spotlight for ' + s);
    panel.style.outline = '3px solid #ffd700'; panel.style.outlineOffset = '2px'; panel.setAttribute('data-spot', '1');
  }, sel);

  // The renderer lays a 110px caption bar over the bottom of every frame, so keep the subject in
  // the top 970px. Centres short elements; shows the top of tall ones. Only call this once the
  // page has finished re-rendering, or the layout moves after the scroll.
  const frame = (sel, wholePanel) => page.locator(sel).first().evaluate((el, panel) => {
    const e = (panel && el.closest('.panel')) || el;
    const r = e.getBoundingClientRect();
    const H = 970;
    const want = r.height > H - 120 ? 50 : (H - r.height) / 2;
    window.scrollBy(0, r.top - want);
  }, !!wholePanel);

  // ---- 1-2: war room, then the Recovery tab (rendered inside an iframe) ---------
  await page.goto(BASE + '/html/war-rooms/construct-war/construction-war-room.html', { waitUntil: 'domcontentloaded' });
  await step('war-room', async () => {}, {
    see: ['#personaTabBar', '#pt-btn-recovery'], text: ['#pt-btn-recovery', /recovery/i], wait: 2000,
  });

  await step('recovery-tab', async () => {
    await page.locator('#pt-btn-recovery').click({ timeout: 4000 });
    const inner = page.frameLocator('#tabpanel-recovery iframe');
    await inner.locator('#kpis .kpi').first().waitFor({ timeout: 10000 });
    const kpis = (await inner.locator('#kpis').innerText()).replace(/\s+/g, ' ');
    if (!kpis.includes('+$3,100,000') || !/9 wks behind/i.test(kpis)) throw new Error('KPI strip inside the war room is wrong: ' + kpis.slice(0, 140));
  }, { need: ['#pt-btn-recovery'], see: ['#tabpanel-recovery iframe'], wait: 1500 });

  // ---- 3: the same page, full size -----------------------------------------------
  await step('kpis-full-size', async () => {
    await page.goto(BASE + '/html/construction-suite/construction-recovery.html', { waitUntil: 'domcontentloaded' });
    await page.addStyleTag({ content: 'body{padding-bottom:160px !important}' }); // room to scroll the last panels clear of the caption bar
  }, {
    see: ['#kpis .kpi'], text: ['#kpis', /9 wks behind[\s\S]*\+\$3,100,000[\s\S]*\+\$1,400,000[\s\S]*\b41\b/i],
    record: { kpis: '#kpis' }, wait: 1500,
  });

  // ---- 4-6: spotlight the three panels -------------------------------------------
  const panelStep = (label, sel, re) => step(label, async () => { await spot(sel); await frame(sel, true); }, {
    need: [sel], text: [sel, re], same: true,
  });
  await panelStep('recovery-plan', '#plan', /second crew/i);
  await panelStep('ranked-exposures', '#exp', /CO-01/);
  await panelStep('change-orders', '#cos', /CO-11/);

  // ---- 7: a draft for review -----------------------------------------------------
  await step('draft-for-review', async () => {
    await page.locator(`${co('CO-03')} button:has-text("DRAFT")`).click({ timeout: 4000 });
    await page.locator(`${co('CO-03')} pre`).waitFor({ timeout: 8000 });
    await frame(co('CO-03'));
  }, {
    need: [`${co('CO-03')} button:has-text("DRAFT")`], see: [`${co('CO-03')} pre`], text: ['#cos', /(Template draft|AI draft)/],
  });

  // ---- 8-9: two-click accept -----------------------------------------------------
  // The page disarms a button after 4s, so step 8 waits less than the default.
  await step('accept-armed', async () => {
    await page.locator(`${co('CO-03')} button:has-text("ACCEPT")`).click({ timeout: 4000 });
    await frame(co('CO-03'));
  }, {
    need: [`${co('CO-03')} button:has-text("ACCEPT")`], see: [`${co('CO-03')} button.armed`], text: ['#cos', /CONFIRM APPROVE/], wait: 600,
  });
  await step('decision-recorded', async () => {
    await page.locator(`${co('CO-03')} button.armed`).click({ timeout: 3000 });
    await page.waitForFunction(() => /Decision recorded/.test(document.querySelector('#cos').innerText), null, { timeout: 8000 });
    await page.waitForTimeout(500); // the page re-renders the cards after a decision
    await frame(co('CO-03'));
  }, {
    need: [`${co('CO-03')} button.armed`], text: ['#cos', /Decision recorded/], statusSelector: '#msg',
  });

  // ---- 10-11: override blocked, then recorded -------------------------------------
  const override = async (note, expectMsg) => {
    const card = page.locator(co('CO-07'));
    await card.locator('input').fill(note, { timeout: 4000 });
    const btn = card.locator('button:has-text("OVERRIDE")');
    await btn.click({ timeout: 4000 }); // arms
    await btn.click({ timeout: 4000 }); // confirms
    await page.waitForFunction((src) => new RegExp(src).test(document.querySelector('#msg').innerText), expectMsg.source, { timeout: 8000 });
    await page.waitForTimeout(500); // re-render
    await frame(co('CO-07'));
  };
  await step('override-blocked', () => override(NOTE_SHORT, /Blocked/), {
    need: [`${co('CO-07')} input`], text: ['#msg', /Blocked/], statusSelector: '#msg', wait: 1200,
  });
  await step('override-recorded', () => override(NOTE_REAL, /CO-07 approve recorded/), {
    need: [`${co('CO-07')} input`], text: ['#cos', /override: Owner agreed/i], statusSelector: '#msg', wait: 1200,
  });

  // ---- 12: the audit trail ---------------------------------------------------------
  await step('audit-trail', async () => {
    await spot('.audit');
    const txt = (await page.locator('#audit').innerText()).replace(/\s+/g, ' ');
    for (const need of ['CHANGE_ORDER_DECISION', 'CO-03', 'CO-07', 'by admin']) {
      if (!txt.includes(need)) throw new Error('audit panel is missing "' + need + '": ' + txt.slice(0, 160));
    }
    await frame('.audit', true);
  }, { need: ['#audit'], text: ['#audit', /CHANGE_ORDER_DECISION/], same: true });

  const { n } = writeSidecar(SIDECAR);
  console.log(`\n${n} frames captured -> ${OUT}`);
  if (n !== EXPECTED_FRAMES) return stop(`expected ${EXPECTED_FRAMES} frames, captured ${n}; manifests/construct-war.json is keyed to ${EXPECTED_FRAMES} states`);
  if (pageErrors.length) return stop('page errors seen during capture: ' + [...new Set(pageErrors)].join(' | '));
  await browser.close();
})();
