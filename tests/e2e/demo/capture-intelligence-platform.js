#!/usr/bin/env node
// capture-intelligence-platform.js — fail-loud capture of the cross-app Intelligence
// Platform tour (Workforce Intelligence -> L1 -> SAP -> Operational OS).
//
//   node capture-intelligence-platform.js        (server must be running)
//
// Replaces intelligence-platform-demo.spec.js, which used page.goto jumps and a
// clickIfVisible() that silently skipped missing controls, had no assertions, and
// produced a last frame that duplicated the one before it.
//
// Differences here:
//   * logs in (these routes require a session)
//   * every step must find its control visible+enabled, see the UI change, and
//     show no visible error — otherwise the run STOPS and names the step
//   * cross-app navigation only happens at explicit, named act-boundary steps
//   * no frame may be byte-identical to the previous one
//   * writes intelligence-platform-capture.json recording the real on-screen text
//     per frame, so captions/narration can be checked against what is shown
//
// Known environment limits, captured honestly rather than worked around:
//   * Workforce Intelligence's candidate lookup and the Operational OS executive
//     package both require MONGODB_URI, which is not configured in this local
//     environment. The pilot-scenario toggle (Act I) and the empty-state executive
//     prompt (Act IV) do not depend on it, so those are what the tour shows.

const { chromium } = require('playwright');
const path = require('path');
const { createCapture } = require('../helpers/demo-step.js');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const PASS = process.env.TSM_LOGIN_PASSWORD || 'dev';
const OUT = path.join(__dirname, 'screenshots', 'intelligence-platform');
const SIDECAR = path.join(__dirname, 'intelligence-platform-capture.json');

const OFF = { inc: 'INC0099887', asset: 'FIN-LT-0042',
  text: 'Employee offboarding: departing employee last day Friday. Laptop FIN-LT-0042 must be returned to inventory and the device record updated.' };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const { step, writeSidecar, pageErrors } = createCapture({ page, browser, outDir: OUT, base: BASE });
  const w = (ms) => page.waitForTimeout(ms);
  const click = (sel) => () => page.locator(sel).first().click({ timeout: 4000 });

  const lr = await page.request.post(BASE + '/api/auth/login', { data: { password: PASS } });
  if (!lr.ok()) { console.error('login failed: HTTP ' + lr.status()); await browser.close(); process.exit(1); }
  console.log('Logged in. Capturing to ' + OUT);

  // ACT I — Workforce Intelligence
  await page.goto(BASE + '/html/tsm-workforce-intelligence-command-center.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#pilot-mode-btn'); await w(1200);
  await step('workforce-intelligence', async () => {}, {});
  await step('workforce-scenario-toggle', click('#pilot-mode-btn'), { need: ['#pilot-mode-btn'],
    text: ['#deployment-scenario-title', /Standard Multi-Tenant Pilot/], focus: '#deployment-scenario-title',
    record: { scenario: '#deployment-scenario-desc' } });

  // ACT II — L1 Intelligence
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} }).catch(() => {});
  await page.goto(BASE + '/html/l1-copilot/l1-ticket-copilot.html', { waitUntil: 'domcontentloaded' });
  await w(1200);
  await step('l1-intelligence', async () => {}, { see: ['#tkIncident'] });
  await step('l1-ticket-evaluated', async () => {
    await page.fill('#tkIncident', OFF.inc, { timeout: 4000 });
    await page.fill('#tkAsset', OFF.asset, { timeout: 4000 });
    await page.fill('#tkDescription', OFF.text, { timeout: 4000 });
    await page.locator('#btnEvaluateWorkflow').first().click({ timeout: 4000 });
  }, { need: ['#btnEvaluateWorkflow'], text: ['#l1WorkflowGateResult', /TASK TYPE:\s*OFFBOARDING/],
    focus: '#l1WorkflowGateResult', wait: 2500, record: { gate: '#l1WorkflowGateResult' } });

  // ACT III — SAP Intelligence
  await page.goto(BASE + '/html/war-rooms/sap/sap-strategist.html', { waitUntil: 'domcontentloaded' });
  await w(1200);
  await step('sap-intelligence', async () => {}, { see: ['#startJourneyBtn'] });
  await step('sap-customer-journey', click('#startJourneyBtn'), { need: ['#startJourneyBtn'],
    text: ['#demoState', /CUSTOMER JOURNEY STARTED/], focus: '#demoState', record: { demoState: '#demoState' } });
  await step('sap-business-object-trace', click('#traceCustomerBtn'), { need: ['#traceCustomerBtn'],
    text: ['#demoState', /BUSINESS OBJECT TRACE/], see: ['#decisionPanel'], focus: '#decisionPanel', record: { demoState: '#demoState' } });
  await step('sap-downstream-impact', click('#downstreamBtn'), { need: ['#downstreamBtn'],
    text: ['#demoState', /DOWNSTREAM IMPACT/], focus: '#demoState', record: { demoState: '#demoState' } });
  await step('sap-enterprise-impact', click('#impactBtn'), { need: ['#impactBtn'],
    text: ['#demoState', /ENTERPRISE IMPACT/], focus: '#demoState', record: { demoState: '#demoState' } });
  await step('sap-executive-decision', click('#decisionBtn'), { need: ['#decisionBtn'],
    text: ['#demoState', /EXECUTIVE DECISION PACKAGE/], focus: '#demoState', record: { demoState: '#demoState' } });

  // ACT IV — Executive Decision Layer
  await page.goto(BASE + '/html/tsm-operational-os-executive.html', { waitUntil: 'domcontentloaded' });
  await w(1500);
  await step('executive-decision-layer', async () => {}, { see: ['#casePicker'],
    text: ['#status', /Enter a case ID|No BPO cases stored|Sign in/i], record: { status: '#status' } });

  // CLOSING — the loop returns to where it started
  await page.goto(BASE + '/html/tsm-workforce-intelligence-command-center.html', { waitUntil: 'domcontentloaded' });
  await step('platform-loop-closes', async () => {}, { see: ['#pilot-mode-btn'] });

  const { n } = writeSidecar(SIDECAR);
  console.log('\n✓ ' + n + ' unique frames captured -> ' + OUT);
  console.log('  sidecar: ' + SIDECAR);
  if (pageErrors.length) console.log('  note: page errors seen: ' + [...new Set(pageErrors)].join(' | '));
  await browser.close();
})().catch((e) => { console.error('CAPTURE ERROR', e.message); process.exit(1); });
