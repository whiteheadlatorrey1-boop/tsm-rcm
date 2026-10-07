const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { stubWarRoom } = require('./helpers/stub-war-room');

const OUT = path.resolve(__dirname, 'demo', 'screenshots', 'healthcare-flagship');
const RELAY_KEY = 'TSM_HONEYWELL_HEALTHCARE_RELAY';
const readRelay = (page) => page.evaluate(
  (k) => sessionStorage.getItem(k) || localStorage.getItem(k), RELAY_KEY);

const ENGINES = [
  'FACILITY SIGNAL: chiller plant fault in the east tower; supply-air temperature rising in 3 zones including the surgical suite. STAGE: degraded cooling, pre-failure.',
  'KPI_JSON: {"leadTimeEstimate": "3-6 hours"}\nSurgical suite and pharmacy storage approach temperature limits within 3-6 hours. 4 scheduled procedures are affected.',
  'CURRENT STAGE: degraded cooling. ESCALATION RISK: 55% probability of loss of one chiller train within 4 hours; backup capacity covers 60% of load.',
  'KPI_JSON: {"totalExposureLow": 350000, "totalExposureHigh": 800000}\nProcedure rescheduling, temporary cooling and inventory protection total roughly $350K-$800K.',
  '1. AUTHORIZE: Deploy temporary cooling units to surgical suite · Owner: Facilities Director · Deadline: 2 hours · Cost: $45,000',
  'KPI_JSON: {"riskScore": 77}\n▸ INCIDENT SUMMARY — Chiller fault is degrading cooling to the surgical suite and pharmacy storage.\n▸ FINANCIAL IMPACT — $350,000 to $800,000.\n▸ DECISIONS REQUIRED\n  1. AUTHORIZE: Deploy temporary cooling units · Owner: Facilities Director · Deadline: 2 hours · Cost: $45,000\n  2. ESCALATE: Notify clinical operations to review the procedure schedule · Owner: Chief Operating Officer · Deadline: 2 hours · Cost: $0\n  3. REVIEW: Pharmacy cold-storage contingency · Owner: Pharmacy Director · Deadline: 4 hours · Cost: $10,000\n▸ BNCA — Deploy temporary cooling to protect the surgical suite.\n▸ ESCALATION TRIGGER — Notify the board if a second chiller train is lost.',
];

test.setTimeout(90000);

test('Healthcare: thermal continuity war room to strategist to executive portal', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  fs.mkdirSync(OUT, { recursive: true });
  let frame = 1;
  const shot = async (name) => {
    const id = String(frame++).padStart(3, '0');
    await page.screenshot({ path: path.join(OUT, `${id}-${name}.png`) });
    console.log(`CAPTURED ${id} ${name}`);
  };

  await stubWarRoom(page, ENGINES);
  await page.goto('/html/war-rooms/healthcare-thermal-continuity.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#fireBtn')).toBeVisible();
  await shot('war-room-landing');

  await page.locator('#sampleBtnHvac').click();
  await page.waitForTimeout(600);
  await shot('hvac-sample-loaded');

  await expect(page.locator('#escalateBtn')).toBeDisabled();
  await page.locator('#fireBtn').click();
  await expect(page.locator('#escalateBtn')).toBeEnabled({ timeout: 30000 });
  await expect(page.locator('#kpiEngines')).toHaveText('6/6');
  await expect(page.locator('#kpiRisk')).toHaveText('77/100');
  await page.waitForTimeout(800);
  await shot('engines-complete');

  await page.locator('#escalateBtn').click();
  await page.waitForURL('**/honeywell-strategist.html', { timeout: 15000 });
  expect(await readRelay(page), `relay ${RELAY_KEY} missing at strategist`).not.toBeNull();
  await page.locator('#refreshBtn').click();
  await expect(page.getByText(/ACTIVE DOMAINS RECEIVING/i).first()).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);
  await shot('strategist-received-relay');

  await page.goto('/html/war-rooms/honeywell-executive-portal.html', { waitUntil: 'domcontentloaded' });
  expect(await readRelay(page), `relay ${RELAY_KEY} missing at executive portal`).not.toBeNull();
  await expect(page.locator('#tsmk-delivery-btn')).toBeVisible();
  await page.waitForTimeout(1200);
  await shot('executive-portal');
});
