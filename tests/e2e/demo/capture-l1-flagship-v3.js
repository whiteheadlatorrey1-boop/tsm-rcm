#!/usr/bin/env node
// capture-l1-flagship-v3.js  —  fail-loud capture of the real L1 flow.
//
//   node capture-l1-flagship-v3.js        (server must be running)
//
// Differences from the V2 spec (which silently produced 15 identical frames):
//   * logs in (L1 routes require a session)
//   * ticket TEXT drives the task type (offboarding, then a software request)
//   * Asset Lifecycle / Resolution / Escalation are reached through the sidebar
//   * every step must find its control visible+enabled, see the UI change,
//     and show no visible error — otherwise the run STOPS and names the step
//   * no frame may be byte-identical to the previous one
//   * writes l1-flagship-v3-capture.json recording the real on-screen result
//     text per frame, so captions can be checked against what is shown
//
// Local data side effects: the app may write data/l1-copilot-handoffs.json.
// ServiceNow steps are omitted: ServiceNow is not configured in this local environment.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const PASS = process.env.TSM_LOGIN_PASSWORD || 'dev';
const OUT = path.join(__dirname, 'screenshots', 'l1-platform-flagship-v3');
const SIDECAR = path.join(__dirname, 'l1-flagship-v3-capture.json');
const ERR_RE = /(evaluation failed|unauthori[sz]ed|not defined|lookup failed|request failed|failed to|is not a function)/i;
const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const pad = (n) => String(n).padStart(3, '0');

const OFF = { inc: 'INC0099887', asset: 'FIN-LT-0042',
  text: 'Employee offboarding: departing employee last day Friday. Laptop FIN-LT-0042 must be returned to inventory and the device record updated.' };
const SOFT = { inc: 'INC0099888', asset: 'FIN-LT-0042',
  text: 'User requests installation of Adobe Acrobat software on their laptop. Software request, license available.' };

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.png')) fs.unlinkSync(path.join(OUT, f));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 120)));

  let n = 0, prevShot = null, prevSig = null;
  const log = [];
  const w = (ms) => page.waitForTimeout(ms);

  async function diagnose() {
    return page.evaluate(() => {
      const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      return location.pathname + ' | visible buttons: ' +
        [...document.querySelectorAll('button[id]')].filter(vis).map((e) => e.id + (e.disabled ? '(dis)' : '')).slice(0, 30).join(' ');
    });
  }
  async function fail(id, why) {
    console.error('\n✗ STEP ' + id + ' FAILED: ' + why);
    console.error('  ' + (await diagnose().catch(() => '?')));
    if (pageErrors.length) console.error('  page errors: ' + [...new Set(pageErrors)].join(' | '));
    await browser.close();
    process.exit(1);
  }
  const usable = (sel) => page.locator(sel).first().evaluate((e) => {
    const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.disabled;
  }).catch(() => false);

  // step(label, action, { need, see, text, focus, same })
  async function step(label, action, o = {}) {
    n++;
    const id = pad(n) + '-' + label;
    for (const sel of o.need || []) if (!(await usable(sel))) return fail(id, 'control not visible/enabled before action: ' + sel);
    try { await action(); } catch (e) { return fail(id, 'action threw: ' + e.message.split('\n')[0]); }
    await w(o.wait || 1100);
    for (const sel of o.see || []) {
      try { await page.locator(sel).first().waitFor({ state: 'visible', timeout: 6000 }); }
      catch (e) { return fail(id, 'expected element did not appear: ' + sel); }
    }
    if (o.text) {
      try { await page.waitForFunction(([s, re]) => { const e = document.querySelector(s); return !!e && new RegExp(re, 'i').test(e.innerText); },
              [o.text[0], o.text[1].source], { timeout: 15000 }); }
      catch (e) { return fail(id, o.text[0] + ' never matched ' + o.text[1] + '; shows: ' +
        ((await page.locator(o.text[0]).first().innerText().catch(() => '(missing)')).replace(/\s+/g, ' ').slice(0, 160))); }
    }
    const errs = await page.evaluate(() => [...document.querySelectorAll('.err')]
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && e.innerText.trim(); })
      .map((e) => e.innerText.trim().slice(0, 80)));
    if (errs.length) return fail(id, 'visible error on screen: ' + errs.join(' | '));
    const gate = (await page.locator('#l1WorkflowGateResult').first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    if (ERR_RE.test(gate)) return fail(id, 'gate shows an error: ' + gate.slice(0, 140));
    const sig = md5(await page.evaluate(() => document.body.innerText));
    if (!o.same && sig === prevSig) return fail(id, 'the page text did not change after this action (nothing happened)');
    if (o.focus) await page.locator(o.focus).first().scrollIntoViewIfNeeded().catch(() => {});
    await w(250);
    const png = await page.screenshot();
    if (md5(png) === prevShot) return fail(id, 'frame is byte-identical to the previous frame');
    prevShot = md5(png); prevSig = sig;
    fs.writeFileSync(path.join(OUT, id + '.png'), png);
    const ao = (await page.locator('#aoAssistOut').first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 200);
    log.push({ n, id, url: page.url().replace(BASE, ''), gate: gate.slice(0, 200), aoAssist: ao || undefined, shot: md5(png).slice(0, 8) });
    console.log('  ✓ ' + id + (gate ? '   [' + gate.slice(0, 70) + ']' : ''));
  }

  const nav = (sec) => () => page.locator('.sb-item[data-section="' + sec + '"]').first().click({ timeout: 4000 });
  const click = (sel) => () => page.locator(sel).first().click({ timeout: 4000 });
  const check = (sel) => () => page.locator(sel).first().check({ timeout: 4000 });
  const fillTag = (v) => async () => { await page.fill('#l1AssetRecoveryTag', v, { timeout: 4000 }); };
  const selectOutcome = (v) => async () => { await page.selectOption('#l1AssetRecoveryOutcome', v, { timeout: 4000 }); };
  const fillAoIfEmpty = (map) => async () => { for (const [k, v] of Object.entries(map)) { const loc = page.locator('[data-ao-field="' + k + '"]').first(); if (!(await loc.inputValue({ timeout: 4000 }))) await loc.fill(v, { timeout: 4000 }); } };
  const fillSel = (sel, v) => async () => { await page.fill(sel, v, { timeout: 4000 }); };
  const selectIn = (sel, v) => async () => { await page.selectOption(sel, v, { timeout: 4000 }); };
  const fillTicket = (t) => async () => {
    await page.fill('#tkIncident', t.inc, { timeout: 4000 });
    await page.fill('#tkAsset', t.asset, { timeout: 4000 });
    await page.fill('#tkDescription', t.text, { timeout: 4000 });
  };
  const freshTicketPage = async () => {
    await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} }).catch(() => {});
    await page.goto(BASE + '/html/l1-copilot/l1-ticket-copilot.html', { waitUntil: 'domcontentloaded' });
    await w(1200);
  };

  const lr = await page.request.post(BASE + '/api/auth/login', { data: { password: PASS } });
  if (!lr.ok()) { console.error('login failed: HTTP ' + lr.status()); await browser.close(); process.exit(1); }
  console.log('Logged in. Capturing to ' + OUT);

  // ACT I — command center
  await page.goto(BASE + '/html/l1-copilot/enterprise-command-center.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#l1a-fab'); await w(1200);
  await step('command-center', async () => {}, { same: true });
  await step('assistant-open', click('#l1a-fab'), { see: ['#l1a-panel.l1a-open'] });

  // ACT II — offboarding ticket: understand
  await step('ticket-copilot', async () => { await page.locator('#l1a-close').first().click({ timeout: 3000 }).catch(() => {}); await freshTicketPage(); }, { see: ['#tkIncident'] });
  await step('ticket-entered', fillTicket(OFF), { focus: '#tkDescription' });
  await step('workflow-evaluated', click('#btnEvaluateWorkflow'), { need: ['#btnEvaluateWorkflow'],
    text: ['#l1WorkflowGateResult', /TASK TYPE:\s*OFFBOARDING/], see: ['#btnLookupAssetRecovery', '#btnLocationLookup'], focus: '#l1WorkflowGateResult', wait: 2500 });

  // ACT III — verify
  await step('asset-tag-entered', fillTag('FIN-LT-0042'), { need: ['#l1AssetRecoveryTag'], focus: '#l1AssetRecoveryTag', same: true });
  await step('asset-recovery-lookup', click('#btnLookupAssetRecovery'), { need: ['#btnLookupAssetRecovery'],
    text: ['#l1AssetRecoveryCmdbResult', /Found:.*\[demo data\]/], focus: '#l1AssetRecoveryCmdbResult', wait: 1800 });
  await step('recovery-outcome-selected', selectOutcome('RETURNED_TO_STOCK'), { need: ['#l1AssetRecoveryOutcome'], focus: '#l1AssetRecoveryOutcome', same: true });
  await step('technician-confirmed', check('#l1AssetRecoveryConfirmed'), { need: ['#l1AssetRecoveryConfirmed'], focus: '#l1AssetRecoveryConfirmed', same: true });
  await step('asset-recovery-verified', click('#btnVerifyAssetRecovery'), { need: ['#btnVerifyAssetRecovery'],
    text: ['#l1AssetRecoveryStatus', /^(?!.*not verified).*(verified|confirmed)/], focus: '#btnVerifyAssetRecovery', wait: 1500 });

  // ACT IV — asset lifecycle: AI recommends, technician authorizes
  await step('asset-lifecycle-tab', nav('assetops'), { see: ['#btnAoAssist'], focus: '#btnAoAssist' });
  await step('ao-fields-filled', fillAoIfEmpty({ INCIDENT_NUMBER: 'INC0099887', ASSET_TAG: 'FIN-LT-0042', TECHNICIAN: 'Demo Technician', RETURN_REASON: 'Employee offboarding - laptop returned to inventory' }), { need: ['[data-ao-field="TECHNICIAN"]', '[data-ao-field="RETURN_REASON"]'], focus: '#aoFields', same: true });
  await step('ai-assist', click('#btnAoAssist'), { need: ['#btnAoAssist'], text: ['#aoAssistOut', /Return to Inventory/], focus: '#aoAssistOut', wait: 3000 });
  await step('technician-confirm-checked', check('#aoTechnicianConfirm'), { need: ['#aoTechnicianConfirm'], text: ['#aoOutput', /RETURN TO INVENTORY/], focus: '#btnAoConfirm', same: true });
  await step('action-confirmed', click('#btnAoConfirm'), { need: ['#btnAoConfirm'], text: ['#aoConfirmOut', /Action confirmed/], focus: '#aoConfirmOut', wait: 1800 });

  // ACT V — record
  await step('resolution-tab', nav('resolution'), { see: ['#btnBuildResolution'], focus: '#btnBuildResolution' });

  // ACT VI — handoff and closure
  await step('escalation-tab', nav('escalation'), { see: ['#btnBuildEscalation'], focus: '#btnBuildEscalation' });
  await step('ticket-tab-evidence', nav('ticket'), { see: ['#l1EvidenceUserVerified'], focus: '#l1EvidenceUserVerified' });
  await step('user-verified', check('#l1EvidenceUserVerified'), { need: ['#l1EvidenceUserVerified'], focus: '#l1EvidenceUserVerified', same: true });
  await step('work-confirmed', check('#l1EvidenceWorkConfirmed'), { need: ['#l1EvidenceWorkConfirmed'], focus: '#l1EvidenceWorkConfirmed', same: true });
  await step('tested', check('#l1EvidenceTested'), { need: ['#l1EvidenceTested'], focus: '#l1EvidenceTested', same: true });
  await step('final-work-note-confirmed', check('#l1EvidenceFinalWorkNoteConfirmed'), { need: ['#l1EvidenceFinalWorkNoteConfirmed'], focus: '#l1EvidenceFinalWorkNoteConfirmed', same: true });
  await step('closure-gate', async () => { await page.locator('.sb-item[data-section="ticket"]').first().click({ timeout: 4000 }); await w(600);
    await page.locator('#btnEvaluateWorkflow').first().click({ timeout: 4000 }); },
    { text: ['#l1WorkflowGateResult', /CLOSURE:/], focus: '#l1WorkflowGateResult', wait: 2500 });

  // ACT VII — a second ticket type: software request fulfillment
  await step('software-ticket-evaluated', async () => { await freshTicketPage(); await fillTicket(SOFT)(); await w(500); await page.locator('#btnEvaluateWorkflow').first().click({ timeout: 4000 }); },
    { text: ['#l1WorkflowGateResult', /TASK TYPE:\s*SOFTWARE/], see: ['#btnLookupRequestFulfillment'], focus: '#l1WorkflowGateResult', wait: 2500 });
  await step('request-number-entered', fillSel('#l1RequestFulfillmentNumber', 'RITM0010001'), { need: ['#l1RequestFulfillmentNumber'], focus: '#l1RequestFulfillmentNumber', same: true });
  await step('request-fulfillment-lookup', click('#btnLookupRequestFulfillment'), { need: ['#btnLookupRequestFulfillment'], text: ['#l1RequestFulfillmentLookup', /Found:.*\[demo data\]/], focus: '#l1RequestFulfillmentLookup', wait: 1800 });
  await step('fulfillment-outcome-selected', selectIn('#l1RequestFulfillmentOutcome', 'FULFILLED'), { need: ['#l1RequestFulfillmentOutcome'], focus: '#l1RequestFulfillmentOutcome', same: true });
  await step('software-installed-confirmed', check('#l1RequestFulfillmentSoftwareConfirmed'), { need: ['#l1RequestFulfillmentSoftwareConfirmed'], focus: '#l1RequestFulfillmentSoftwareConfirmed', same: true });
  await step('fulfillment-technician-confirmed', check('#l1RequestFulfillmentConfirmed'), { need: ['#l1RequestFulfillmentConfirmed'], focus: '#l1RequestFulfillmentConfirmed', same: true });
  await step('request-fulfillment-verified', click('#btnVerifyRequestFulfillment'), { need: ['#btnVerifyRequestFulfillment'], text: ['#l1RequestFulfillmentStatus', /^(?!.*not verified).*(verified|fulfilled|confirmed)/i], focus: '#l1RequestFulfillmentStatus', wait: 1500 });

  // ACT VIII — executive view and back
  await step('executive-view', async () => { await page.goto(BASE + '/html/l1-copilot/l1-exec-portal.html', { waitUntil: 'domcontentloaded' }); }, { wait: 2500 });
  await step('final-command-center', async () => { await page.goto(BASE + '/html/l1-copilot/enterprise-command-center.html', { waitUntil: 'domcontentloaded' }); }, { see: ['#l1a-fab'], wait: 1500 });

  fs.writeFileSync(SIDECAR, JSON.stringify({ capturedAt: new Date().toISOString(), base: BASE, frames: log, pageErrors: [...new Set(pageErrors)] }, null, 2));
  console.log('\n✓ ' + n + ' unique frames captured -> ' + OUT);
  console.log('  sidecar: ' + SIDECAR);
  if (pageErrors.length) console.log('  note: page errors seen: ' + [...new Set(pageErrors)].join(' | '));
  await browser.close();
})().catch((e) => { console.error('CAPTURE ERROR', e.message); process.exit(1); });
