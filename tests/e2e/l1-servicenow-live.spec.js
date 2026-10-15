// tests/e2e/l1-servicenow-live.spec.js
//
// L1 Ticket Copilot (html/l1-copilot/l1-ticket-copilot.html) driven against a
// real ServiceNow PDI, in a real browser. Companion to
// scripts/test-l1-servicenow-live.js (adapter + route-level acceptance) —
// this proves the same connected behavior through the actual UI a
// technician uses: pull an incident, look up an asset, reconcile a RITM,
// and save a governed work note.
//
// SECURITY: never prints, logs, or persists SERVICENOW_PASSWORD. The test
// server is booted with env vars already present in the process (from
// ~/.tsm-servicenow.env); nothing here echoes them.
//
// Skips cleanly (no failure) when SERVICENOW_INTEGRATION_ENABLED is not
// "true" -- this spec requires a real, reachable instance and is not
// meaningful against a mock.
//
// GROQ_API_KEY is not configured in this environment, so the AI
// resolution-draft generation step (buildResolution(), POST
// /api/l1-copilot/resolution without writeToServicenow) cannot run here.
// This spec stands in for that one step by writing directly into
// #resolutionOutput via page.evaluate -- clearly labeled below as
// technician-authored test content standing in for an AI draft, NOT a
// simulation of ServiceNow. Every step downstream of that -- the technician
// confirmation checkbox, the POST to /api/l1-copilot/resolution with
// writeToServicenow+technicianConfirmed, the Action Gate, and the real
// ServiceNow write with its read-after-write verification -- is exactly the
// real code path, unstubbed, against the real PDI.

const { test, expect } = require('@playwright/test');

const LIVE = process.env.SERVICENOW_INTEGRATION_ENABLED === 'true';
const BASE = process.env.BASE_URL || 'http://localhost:3100';
const ADMIN_PASSWORD = process.env.TSM_ADMIN_PASSWORD || 'test-admin-pw';

test.describe('L1 Ticket Copilot: connected acceptance against a real ServiceNow PDI', () => {
  test.skip(!LIVE, 'SERVICENOW_INTEGRATION_ENABLED is not "true" -- no live ServiceNow PDI configured for this run.');

  test.setTimeout(90000);

  let adapter;
  let cfg;
  let testIncidentNumber = null;

  test.beforeAll(() => {
    adapter = require('../../server/l1-copilot/servicenow-adapter');
    cfg = adapter.loadConfigFromEnv();
    if (!cfg) throw new Error('SERVICENOW_INTEGRATION_ENABLED=true but loadConfigFromEnv() returned null -- check SERVICENOW_INSTANCE_URL.');
  });

  test.afterAll(async () => {
    if (testIncidentNumber) {
      try {
        await adapter._pdi.deleteTicket(testIncidentNumber, cfg);
        console.log('Cleaned up test incident:', testIncidentNumber);
      } catch (e) {
        console.error('COULD NOT DELETE test incident', testIncidentNumber, '-- remove it manually from the PDI:', e.message);
      }
    }
  });

  test('pulls a real incident, looks up a real asset, reconciles a real RITM, and saves a governed work note on a test-created incident only', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    // --- create the one incident this test is allowed to write to ---
    const created = await adapter._pdi.createTicket({
      short_description: 'TSM L1 acceptance test (Playwright UI)',
      urgency: '3',
      impact: '3'
    }, cfg);
    testIncidentNumber = created.number;
    expect(created.success).toBe(true);

    // --- a real pre-existing asset + RITM, read-only, never written to ---
    const hwData = await adapter._internal.snRequest(cfg, 'GET', '/api/now/table/cmdb_ci_hardware', { query: { sysparm_limit: '1', sysparm_fields: 'asset_tag' } });
    const assetTag = adapter._internal.readField(hwData.result[0], 'asset_tag');
    const ritmData = await adapter._internal.snRequest(cfg, 'GET', '/api/now/table/sc_req_item', { query: { sysparm_limit: '1', sysparm_fields: 'number' } });
    const ritmNumber = adapter._internal.readField(ritmData.result[0], 'number');
    expect(assetTag, 'at least one cmdb_ci_hardware asset exists on this PDI').toBeTruthy();
    expect(ritmNumber, 'at least one sc_req_item exists on this PDI').toBeTruthy();

    // --- authenticate as TSM staff (required once ServiceNow is "live": every
    //     /api/l1-copilot/servicenow/* route except /status requires a staff
    //     session, per server.js's l1StatusOpen/l1LiveGate) ---
    const loginRes = await page.request.post(BASE + '/api/auth/login', { data: { password: ADMIN_PASSWORD } });
    expect(loginRes.ok(), 'admin login succeeds').toBeTruthy();

    await page.goto(BASE + '/html/l1-copilot/l1-ticket-copilot.html', { waitUntil: 'domcontentloaded' });

    // --- 1. pull the test-created incident from ServiceNow ---
    await page.locator('#tkIncident').fill(testIncidentNumber);
    await page.locator('#btnSnPullByIncident').click();
    await expect(page.locator('#snPullOut')).toContainText('Loaded ' + testIncidentNumber + ' from ServiceNow', { timeout: 15000 });
    await expect(page.locator('#snPullOut')).not.toContainText('DEMO DATA');

    // --- 2. asset lookup (read-only, real pre-existing CMDB record) ---
    await page.locator('#tkAsset').fill(assetTag);
    await page.locator('#btnSnPull').click();
    await expect(page.locator('#snPullOut')).toContainText('Pulled from CMDB', { timeout: 15000 });
    await expect(page.locator('#snPullOut')).not.toContainText('DEMO DATA');

    // --- 3. reconcile (read-only, real pre-existing RITM) ---
    await page.locator('#snReconcileRitm').fill(ritmNumber);
    await page.locator('#btnReconcileServiceNow').click();
    await expect(page.locator('#snReconciliationBadge')).not.toHaveText('', { timeout: 15000 });
    const reconcileOutputText = await page.locator('#snReconciliationOutput').innerText();
    expect(reconcileOutputText.toLowerCase()).not.toContain('not found');

    // --- 4. governed work note on the test-created incident only ---
    // GROQ_API_KEY is not configured in this sandbox, so the AI draft step is
    // stood in for here with fixed technician-authored test content (see the
    // file header). Everything from the confirmation checkbox onward is the
    // real, unstubbed write path against the real PDI.
    const draftText = 'TSM L1 acceptance test resolution draft (Playwright UI) — ' + new Date().toISOString();
    // The Resolution tab is only visible once its sidebar item is selected
    // (goToSection('resolution'), normally triggered by buildResolution()'s
    // AI call — which this spec bypasses, see the file header).
    await page.locator('.sb-item[data-section="resolution"]').click();
    await page.evaluate((text) => {
      const out = document.getElementById('resolutionOutput');
      out.textContent = text;
      document.getElementById('resolutionTechnicianConfirm').dispatchEvent(new Event('change'));
    }, draftText);
    await page.locator('#resolutionTechnicianConfirm').check();
    await expect(page.locator('#btnSyncResolution')).toBeEnabled();
    await page.locator('#btnSyncResolution').click();
    await expect(page.locator('#resolutionSyncOut')).toContainText(
      'Technician-confirmed work note written to ' + testIncidentNumber + ' in ServiceNow',
      { timeout: 15000 }
    );

    // --- independent, server-side proof the note actually landed ---
    const verifyTicket = await adapter.getTicket(testIncidentNumber, cfg);
    const notesText = verifyTicket && verifyTicket.raw && verifyTicket.raw.work_notes
      ? (typeof verifyTicket.raw.work_notes === 'object' ? (verifyTicket.raw.work_notes.display_value || '') : verifyTicket.raw.work_notes)
      : '';
    expect(notesText).toContain(draftText);

    expect(pageErrors, 'page errors: ' + pageErrors.join(' | ')).toHaveLength(0);
  });
});
