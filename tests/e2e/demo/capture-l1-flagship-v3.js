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
const path = require('path');
const { createCapture } = require('../helpers/demo-step.js');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const PASS = process.env.TSM_LOGIN_PASSWORD || 'dev';
const OUT = path.join(__dirname, 'screenshots', 'l1-platform-flagship-v3');
const SIDECAR = path.join(__dirname, 'l1-flagship-v3-capture.json');

const OFF = { inc: 'INC0099887', asset: 'FIN-LT-0042',
  text: 'Employee offboarding: departing employee last day Friday. Laptop FIN-LT-0042 must be returned to inventory and the device record updated.' };
const SOFT = { inc: 'INC0099888', asset: 'FIN-LT-0042',
  text: 'User requests installation of Adobe Acrobat software on their laptop. Software request, license available.' };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const { step: step0, writeSidecar, pageErrors } = createCapture({ page, browser, outDir: OUT, base: BASE });
  // Every L1 step logs the workflow-gate text under `gate` (not the generic `status`)
  // and, when present, the AI-assist recommendation under `aoAssist` — matching the
  // field names this sidecar has always used.
  const step = (label, action, o = {}) => step0(label, action, {
    ...o,
    statusSelector: o.statusSelector || '#l1WorkflowGateResult',
    statusKey: 'gate',
    record: { aoAssist: '#aoAssistOut', ...(o.record || {}) },
  });

  const w = (ms) => page.waitForTimeout(ms);
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

  const { n } = writeSidecar(SIDECAR);
  console.log('\n✓ ' + n + ' unique frames captured -> ' + OUT);
  console.log('  sidecar: ' + SIDECAR);
  if (pageErrors.length) console.log('  note: page errors seen: ' + [...new Set(pageErrors)].join(' | '));
  await browser.close();
})().catch((e) => { console.error('CAPTURE ERROR', e.message); process.exit(1); });
