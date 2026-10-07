const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { stubWarRoom } = require('./helpers/stub-war-room');

const OUT = path.resolve(__dirname, 'demo', 'screenshots', 'capital-flagship');
const RELAY_KEY = 'TSM_HONEYWELL_CAPITALPROJECT_RELAY';
const readRelay = (page) => page.evaluate(
  (k) => sessionStorage.getItem(k) || localStorage.getItem(k), RELAY_KEY);

const ENGINES = [
  'PROJECT/CONTRACT: Plant expansion EPC contract, Phase 2. SIGNAL: critical-path slip of 6 weeks after late switchgear delivery. STAGE: schedule slip, pre-liquidated-damages.',
  'KPI_JSON: {"leadTimeEstimate": "6-8 weeks"}\nPhase 2 completion moves from March to May. Two dependent commissioning milestones are at risk.',
  'CURRENT STAGE: schedule slip with early cost pressure. ESCALATION RISK: 50% probability of a cost overrun within 60 days if resequencing is not approved.',
  'KPI_JSON: {"totalExposureLow": 900000, "totalExposureHigh": 1700000}\nAcceleration, standby labor and liquidated-damages exposure total roughly $900K-$1.7M.',
  '1. AUTHORIZE: Approve resequencing of civil and electrical packages · Owner: Project Director · Deadline: 2 days · Cost: $60,000',
  'KPI_JSON: {"riskScore": 68}\n▸ INCIDENT SUMMARY — Switchgear delay has slipped Phase 2 by six weeks.\n▸ FINANCIAL IMPACT — $900,000 to $1,700,000.\n▸ DECISIONS REQUIRED\n  1. AUTHORIZE: Approve package resequencing · Owner: Project Director · Deadline: 2 days · Cost: $60,000\n  2. ESCALATE: Open schedule-relief talks with the owner · Owner: Commercial Manager · Deadline: 5 days · Cost: $10,000\n  3. REVIEW: Liquidated-damages exposure · Owner: Contracts Lead · Deadline: 7 days · Cost: $0\n▸ BNCA — Approve resequencing now to protect the commissioning date.\n▸ ESCALATION TRIGGER — Notify the board if the slip exceeds ten weeks.',
];

test.setTimeout(90000);

test('Capital: project recovery war room to strategist to executive portal', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  fs.mkdirSync(OUT, { recursive: true });
  let frame = 1;
  const shot = async (name) => {
    const id = String(frame++).padStart(3, '0');
    await page.screenshot({ path: path.join(OUT, `${id}-${name}.png`) });
    console.log(`CAPTURED ${id} ${name}`);
  };

  await stubWarRoom(page, ENGINES);
  await page.goto('/html/war-rooms/industrial-capital-project-recovery.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#fireBtn')).toBeVisible();
  await shot('war-room-landing');

  await page.locator('#sampleBtn1').click();
  await page.waitForTimeout(600);
  await shot('schedule-slip-loaded');

  await expect(page.locator('#escalateBtn')).toBeDisabled();
  await page.locator('#fireBtn').click();
  await expect(page.locator('#escalateBtn')).toBeEnabled({ timeout: 30000 });
  await expect(page.locator('#kpiEngines')).toHaveText('6/6');
  await expect(page.locator('#kpiRisk')).toHaveText('68/100');
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
