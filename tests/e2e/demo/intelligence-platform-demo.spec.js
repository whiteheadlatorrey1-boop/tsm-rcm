const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const OUT = path.resolve(__dirname, 'screenshots', 'intelligence-platform');

test.setTimeout(180000);

test('TSM Intelligence Platform — Flagship Presentation', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  fs.mkdirSync(OUT, { recursive: true });

  let frame = 1;

  async function pause(ms = 1200) {
    await page.waitForTimeout(ms);
  }

  async function shot(name) {
    const id = String(frame++).padStart(3, '0');
    const file = path.join(OUT, `${id}-${name}.png`);

    await page.screenshot({
      path: file,
      fullPage: false
    });

    console.log(`CAPTURED ${id} ${name}`);
  }

  async function clickIfVisible(selector) {
    const el = page.locator(selector).first();

    if (await el.count() && await el.isVisible().catch(() => false)) {
      await el.click();
      await pause();
      return true;
    }

    console.log(`SKIPPED ${selector}`);
    return false;
  }

  // ============================================================
  // ACT I — WORKFORCE INTELLIGENCE
  // ============================================================
  console.log('ACT I — WORKFORCE INTELLIGENCE');

  await page.goto(
    `${BASE_URL}/html/tsm-workforce-intelligence-command-center.html`,
    { waitUntil: 'domcontentloaded' }
  );

  await pause(1500);
  await shot('001-workforce-intelligence');

  // Real candidate intelligence interaction
  await clickIfVisible('#candidate-intel-load');
  await shot('002-workforce-candidate-intelligence');

  // ============================================================
  // ACT II — L1 INTELLIGENCE
  // ============================================================
  console.log('ACT II — L1 INTELLIGENCE');

  await page.goto(
    `${BASE_URL}/html/l1-copilot/l1-ticket-copilot.html`,
    { waitUntil: 'domcontentloaded' }
  );

  await pause(1500);
  await shot('003-l1-intelligence');

  // Real technician human-decision gate
  await clickIfVisible('#l1WorkflowGate');
  await shot('004-l1-human-decision-gate');

  // ============================================================
  // ACT III — SAP INTELLIGENCE
  // ============================================================
  console.log('ACT III — SAP INTELLIGENCE');

  await page.goto(
    `${BASE_URL}/html/war-rooms/sap/sap-strategist.html`,
    { waitUntil: 'domcontentloaded' }
  );

  await pause(1500);
  await shot('005-sap-intelligence');

  // Start the actual SAP business-object journey
  await clickIfVisible('#startJourneyBtn');
  await shot('006-sap-customer-journey');

  // Trace the business object through dependencies
  await clickIfVisible('#traceCustomerBtn');
  await shot('007-sap-business-object-trace');

  // Trace downstream impact
  await clickIfVisible('#downstreamBtn');
  await shot('008-sap-downstream-impact');

  // Enterprise impact
  await clickIfVisible('#impactBtn');
  await shot('009-sap-enterprise-impact');

  // Executive decision
  await clickIfVisible('#decisionBtn');
  await shot('010-sap-executive-decision');

  // ============================================================
  // ACT IV — EXECUTIVE DECISION LAYER
  // ============================================================
  console.log('ACT IV — EXECUTIVE DECISION LAYER');

  await page.goto(
    `${BASE_URL}/html/tsm-operational-os-executive.html`,
    { waitUntil: 'domcontentloaded' }
  );

  await pause(1500);
  await shot('011-executive-decision-layer');

  // ============================================================
  // ACT V — PLATFORM END STATE
  // ============================================================
  console.log('ACT V — HUMAN DECISION → ACTION → EVIDENCE → OUTCOME');

  await shot('012-platform-end-state');

  console.log('TSM INTELLIGENCE PLATFORM DEMO COMPLETE');
});
