// TSM L1 Platform — Flagship Presentation Demo
// REAL CLICK → REAL UI CHANGE → CAPTURE
//
// Purpose:
//   5–8 minute executive/technical demonstration of the complete L1 philosophy.
//
// Story:
//   UNDERSTAND → PREPARE → VERIFY → TECHNICIAN CONFIRM
//   → EXECUTE → RECORD → HANDOFF
//
// Important:
//   This spec creates screenshots only.
//   It does NOT modify production application code.
//   It does NOT write to ServiceNow.

const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const OUT = path.resolve(
  __dirname,
  'screenshots',
  'l1-platform-flagship'
);

test.setTimeout(120000);

test('TSM L1 Platform — Flagship Presentation', async ({ page }) => {
  fs.mkdirSync(OUT, { recursive: true });

  let frame = 1;

  async function shot(name) {
    const id = String(frame++).padStart(3, '0');
    const file = path.join(OUT, `${id}-${name}.png`);

    await page.screenshot({
      path: file,
      fullPage: true
    });

    console.log(`CAPTURED ${id} ${name}`);
  }

  async function pause(ms = 900) {
    await page.waitForTimeout(ms);
  }

  async function clickIfVisible(selector) {
    const el = page.locator(selector).first();

    if (await el.count() && await el.isVisible().catch(() => false)) {
      await el.click();
      await pause();
      return true;
    }

    return false;
  }

  async function fillIfVisible(selector, value) {
    const el = page.locator(selector).first();

    if (await el.count() && await el.isVisible().catch(() => false)) {
      await el.fill(value);
      await pause();
      return true;
    }

    return false;
  }

  async function selectIfVisible(selector, value) {
    const el = page.locator(selector).first();

    if (await el.count() && await el.isVisible().catch(() => false)) {
      await el.selectOption(value);
      await pause();
      return true;
    }

    return false;
  }

  // ============================================================
  // ACT I — THE COMMAND CENTER
  // ============================================================

  await page.goto(
    `${BASE_URL}/html/l1-copilot/enterprise-command-center.html`,
    { waitUntil: 'domcontentloaded' }
  );

  await page.waitForSelector('#l1a-fab');
  await pause(1200);

  await shot('001-command-center');

  await page.click('#l1a-fab');
  await page.waitForSelector('#l1a-panel.l1a-open');
  await pause(800);

  await shot('002-command-center-assistant');

  await clickIfVisible('#l1a-close');

  // ============================================================
  // ACT II — TICKET ARRIVES
  // ============================================================

  await page.goto(
    `${BASE_URL}/html/l1-copilot/l1-ticket-copilot.html`,
    { waitUntil: 'domcontentloaded' }
  );

  await page.waitForSelector('#tkIncident');
  await pause(1200);

  await shot('003-ticket-copilot');

  await fillIfVisible('#tkIncident', 'INC0099887');

  await shot('004-incident-context');

  // ============================================================
  // ACT III — UNDERSTAND
  // ============================================================

  await clickIfVisible('#btnSnPullByIncident');

  await pause(1500);

  await shot('005-servicenow-context');

  await clickIfVisible('#btnReconcileServiceNow');

  await pause(1200);

  await shot('006-reconciled-context');

  // ============================================================
  // ACT IV — WORKFLOW / ACTION GATE
  // ============================================================

  await clickIfVisible('#l1WorkflowGate');

  await pause(1200);

  await shot('007-technician-action-gate');

  // ============================================================
  // ACT V — PREPARE / VERIFY
  // ============================================================

  await clickIfVisible('#btnLookupAssetRecovery');

  await pause(1000);

  await shot('008-asset-recovery-lookup');

  await clickIfVisible('#btnVerifyAssetRecovery');

  await pause(1000);

  await shot('009-asset-recovery-verified');

  // ============================================================
  // ACT VI — ASSET LIFECYCLE
  // ============================================================

  await clickIfVisible('#btnAoAssist');

  await pause(800);

  await shot('010-asset-lifecycle-assist');

  await clickIfVisible('#btnAoPreview');

  await pause(900);

  await shot('011-preview-action');

  // Technician confirmation gate
  const aoConfirm = page.locator('#aoTechnicianConfirm');

  if (await aoConfirm.count() && await aoConfirm.isVisible().catch(() => false)) {
    await aoConfirm.check().catch(() => {});
    await pause(500);
  }

  await clickIfVisible('#btnAoConfirm');

  await pause(1000);

  await shot('012-technician-confirmed-action');

  // ============================================================
  // ACT VII — REQUEST FULFILLMENT / RITM / SC TASK
  // ============================================================

  await clickIfVisible('#btnLookupRequestFulfillment');

  await pause(1000);

  await shot('013-request-fulfillment');

  await clickIfVisible('#btnVerifyRequestFulfillment');

  await pause(900);

  await shot('014-request-fulfillment-verified');

  // ============================================================
  // ACT VIII — LOCATION VERIFICATION
  // ============================================================

  await clickIfVisible('#btnLocationLookup');

  await pause(800);

  await shot('015-location-cmdb-lookup');

  await clickIfVisible('#btnLocationVerify');

  await pause(800);

  await shot('016-location-verified');

  // ============================================================
  // ACT IX — RESOLUTION BUILDER
  // ============================================================

  await clickIfVisible('#btnBuildResolution');

  await pause(1200);

  await shot('017-resolution-draft');

  // ============================================================
  // ACT X — HUMAN CONFIRMATION
  // ============================================================

  const resolutionConfirm = page.locator('#resolutionTechnicianConfirm');

  if (
    await resolutionConfirm.count() &&
    await resolutionConfirm.isVisible().catch(() => false)
  ) {
    await resolutionConfirm.check().catch(() => {});
    await pause(600);
  }

  await shot('018-resolution-technician-review');

  await clickIfVisible('#btnSyncResolution');

  await pause(1200);

  await shot('019-resolution-recorded');

  // ============================================================
  // ACT XI — ESCALATION / TIER 2 HANDOFF
  // ============================================================

  await clickIfVisible('#btnBuildEscalation');

  await pause(1200);

  await shot('020-tier2-escalation-package');

  // ============================================================
  // ACT XII — CLOSURE GATE
  // ============================================================

  await clickIfVisible('#l1WorkflowGate');

  await pause(1200);

  await shot('021-closure-gate');

  // ============================================================
  // ACT XIII — EXECUTIVE VIEW
  // ============================================================

  const execLinks = page.locator(
    'a[href*="l1-exec-portal"], button'
  );

  const execLink = page.locator(
    'a[href="/l1-copilot/l1-exec-portal.html"]'
  ).first();

  if (
    await execLink.count() &&
    await execLink.isVisible().catch(() => false)
  ) {
    await execLink.click();
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await pause(1500);

    await shot('022-executive-command-view');
  }

  // ============================================================
  // FINAL — PHILOSOPHY
  // ============================================================

  await page.goto(
    `${BASE_URL}/html/l1-copilot/enterprise-command-center.html`,
    { waitUntil: 'domcontentloaded' }
  );

  await pause(1200);

  await shot('023-final-command-center');

  console.log('');
  console.log('==============================================');
  console.log('TSM L1 FLAGSHIP DEMO COMPLETE');
  console.log(`Frames captured: ${frame - 1}`);
  console.log(`Output: ${OUT}`);
  console.log('==============================================');
});
