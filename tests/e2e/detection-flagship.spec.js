const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { stubWarRoom } = require('./helpers/stub-war-room');

const OUT = path.resolve(__dirname, 'demo', 'screenshots', 'detection-flagship');
const RELAY_KEY = 'TSM_HONEYWELL_DETECTION_RELAY';
const readRelay = (page) => page.evaluate(
  (k) => sessionStorage.getItem(k) || localStorage.getItem(k), RELAY_KEY);

const ENGINES = [
  // 01 Detection Intelligence
  'DETECTION TECHNOLOGY: aspirating smoke detection with Li-ion off-gas sensing in Battery Hall B. FAULT/SIGNAL: sustained off-gas alarm on 2 of 6 sensing zones, rising particulate trend. EVENT STAGE: pre-thermal-runaway warning.',
  // 02 Facility Impact (lead time parsed)
  'KPI_JSON: {"leadTimeEstimate": "45-90 minutes"}\nBattery Hall B holds 18% of site storage capacity. Escalation to thermal runaway is projected within 45-90 minutes if unaddressed.',
  // 03 Failure Progression
  'CURRENT STAGE: off-gas detected, pre-thermal-runaway. ESCALATION RISK: 40% probability of progression within 2 hours; adjacent racks share the same exposure.',
  // 04 Financial Exposure (exposure parsed)
  'KPI_JSON: {"totalExposureLow": 1200000, "totalExposureHigh": 2400000}\nBattery inventory, downtime and containment total roughly $1.2M-$2.4M.',
  // 05 Response Plan (deadline parsed)
  'IMMEDIATE (0-2 hours): isolate affected racks, notify site safety.\n1. AUTHORIZE: Isolate Hall B racks 4-6 · Owner: Site Safety Lead · Deadline: 1 hour · Cost: $25,000',
  // 06 Exec Dispatch (risk + ranked decisions parsed)
  'KPI_JSON: {"riskScore": 74}\n▸ INCIDENT SUMMARY — Off-gas alarms in Battery Hall B indicate a pre-thermal-runaway condition.\n▸ FINANCIAL IMPACT — $1,200,000 to $2,400,000.\n▸ DECISIONS REQUIRED\n  1. AUTHORIZE: Isolate affected racks · Owner: Site Safety Lead · Deadline: 1 hour · Cost: $25,000\n  2. ESCALATE: Notify fire authority and insurer · Owner: Operations Director · Deadline: 2 hours · Cost: $5,000\n  3. REVIEW: Adjacent-rack thermal inspection · Owner: Facilities Engineer · Deadline: 1 day · Cost: $15,000\n▸ BNCA — Isolate the affected racks now to prevent thermal runaway.\n▸ ESCALATION TRIGGER — Notify the board if temperatures cross the alarm threshold.',
];

test.setTimeout(90000);

test('Detection: BESS war room to strategist to executive portal', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  fs.mkdirSync(OUT, { recursive: true });
  let frame = 1;
  const shot = async (name) => {
    const id = String(frame++).padStart(3, '0');
    await page.screenshot({ path: path.join(OUT, `${id}-${name}.png`) });
    console.log(`CAPTURED ${id} ${name}`);
  };

  await stubWarRoom(page, ENGINES);

  await page.goto('/html/war-rooms/advanced-detection-incident.html',
    { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#fireBtn')).toBeVisible();
  await shot('war-room-landing');

  await page.locator('#sampleBtnBess').click();
  await page.waitForTimeout(600);
  await shot('bess-sample-loaded');

  await expect(page.locator('#escalateBtn')).toBeDisabled();
  await page.locator('#fireBtn').click();
  await expect(page.locator('#escalateBtn')).toBeEnabled({ timeout: 30000 });
  await expect(page.locator('#kpiEngines')).toHaveText('6/6');
  await expect(page.locator('#kpiRisk')).toHaveText('74/100');
  await page.waitForTimeout(800);
  await shot('engines-complete');

  await page.locator('#escalateBtn').click();
  await page.waitForURL('**/honeywell-strategist.html', { timeout: 15000 });
  expect(await readRelay(page), `relay ${RELAY_KEY} missing at strategist`).not.toBeNull();

  await page.locator('#refreshBtn').click();
  await expect(page.getByText(/ACTIVE DOMAINS RECEIVING/i).first()).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);
  await shot('strategist-received-relay');

  await page.goto('/html/war-rooms/honeywell-executive-portal.html',
    { waitUntil: 'domcontentloaded' });
  expect(await readRelay(page), `relay ${RELAY_KEY} missing at executive portal`).not.toBeNull();
  await expect(page.locator('#tsmk-delivery-btn')).toBeVisible();
  await page.waitForTimeout(1200);
  await shot('executive-portal');
});
