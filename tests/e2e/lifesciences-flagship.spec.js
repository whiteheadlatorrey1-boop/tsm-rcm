const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { stubWarRoom } = require('./helpers/stub-war-room');

const OUT = path.resolve(__dirname, 'demo', 'screenshots', 'lifesciences-flagship');
const RELAY_KEY = 'TSM_HONEYWELL_LIFESCIENCES_RELAY';
const readRelay = (page) => page.evaluate(
  (k) => sessionStorage.getItem(k) || localStorage.getItem(k), RELAY_KEY);

const ENGINES = [
  'PRODUCTION SIGNAL: environmental excursion in fill-finish Suite B during Batch 24-117. Particulate count above alert limit for 40 minutes. STAGE: batch deviation, under investigation.',
  'KPI_JSON: {"leadTimeEstimate": "5-7 days"}\nBatch 24-117 is on hold pending quality review. Two downstream batches share the suite schedule and slip by about a week.',
  'CURRENT STAGE: deviation opened, root cause not confirmed. ESCALATION RISK: 45% probability the batch is rejected; adjacent batches share the same air handling.',
  'KPI_JSON: {"totalExposureLow": 1500000, "totalExposureHigh": 3200000}\nBatch value at risk, investigation cost and delayed shipments total roughly $1.5M-$3.2M.',
  '1. AUTHORIZE: Hold Batch 24-117 and open a formal deviation investigation · Owner: Head of Quality · Deadline: 4 hours · Cost: $25,000',
  'KPI_JSON: {"riskScore": 73}\n▸ INCIDENT SUMMARY — An environmental excursion in Suite B puts Batch 24-117 and two downstream batches at risk.\n▸ FINANCIAL IMPACT — $1,500,000 to $3,200,000.\n▸ DECISIONS REQUIRED\n  1. AUTHORIZE: Hold the batch and complete the deviation investigation · Owner: Head of Quality · Deadline: 4 hours · Cost: $25,000\n  2. ESCALATE: Notify regulatory affairs of the excursion · Owner: VP Quality · Deadline: 1 day · Cost: $0\n  3. REVIEW: Reschedule downstream batches · Owner: Production Planning Lead · Deadline: 2 days · Cost: $12,000\n▸ BNCA — Hold the batch and complete the investigation before any release decision.\n▸ ESCALATION TRIGGER — Notify the board if the batch is rejected.',
];

test.setTimeout(90000);

test('Life Sciences: production continuity war room to strategist to executive portal', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  fs.mkdirSync(OUT, { recursive: true });
  let frame = 1;
  const shot = async (name) => {
    const id = String(frame++).padStart(3, '0');
    await page.screenshot({ path: path.join(OUT, `${id}-${name}.png`) });
    console.log(`CAPTURED ${id} ${name}`);
  };

  await stubWarRoom(page, ENGINES);
  await page.goto('/html/war-rooms/life-sciences-production-continuity.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#fireBtn')).toBeVisible();
  await shot('war-room-landing');

  await page.locator('#sampleBtn1').click();
  await page.waitForTimeout(600);
  await shot('batch-deviation-loaded');

  await expect(page.locator('#escalateBtn')).toBeDisabled();
  await page.locator('#fireBtn').click();
  await expect(page.locator('#escalateBtn')).toBeEnabled({ timeout: 30000 });
  await expect(page.locator('#kpiEngines')).toHaveText('6/6');
  await expect(page.locator('#kpiRisk')).toHaveText('73/100');
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
