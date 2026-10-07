const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { stubWarRoom } = require('./helpers/stub-war-room');

const OUT = path.resolve(__dirname, 'demo', 'screenshots', 'aerospace-flagship');
const RELAY_KEY = 'TSM_HONEYWELL_AEROSPACE_RELAY';
const readRelay = (page) => page.evaluate(
  (k) => sessionStorage.getItem(k) || localStorage.getItem(k), RELAY_KEY);

const ENGINES = [
  // 01 Maintenance Signal Intel
  'Recurring bleed-air valve fault on 3 narrowbody aircraft; one AOG at the hub. Overhaul interval trend is 18% worse than fleet baseline.',
  // 02 Fleet Readiness Impact (lead time parsed)
  'KPI_JSON: {"leadTimeEstimate": "3-5 days"}\nTwo further aircraft fall below minimum serviceable status within 5 days without a replacement valve.',
  // 03 Parts/Supply Risk
  'Only 1 serviceable valve in the regional pool; OEM lead time 12 days. Exchange unit available from a lessor at a premium.',
  // 04 Financial Exposure (exposure parsed)
  'KPI_JSON: {"totalExposureLow": 420000, "totalExposureHigh": 610000}\nAOG cost, expedite freight, and schedule disruption total roughly $420K-$610K.',
  // 05 Response Plan (deadline parsed)
  'Phase 1 (0-2 hrs): expedite order. Phase 2: reassign rotation.\n1. AUTHORIZE: Expedite exchange valve · Owner: Parts Desk Lead · Deadline: 2 hours · Cost: $38,000',
  // 06 Exec Dispatch (risk + ranked decisions parsed)
  'KPI_JSON: {"riskScore": 82}\n▸ INCIDENT SUMMARY — AOG at hub with two more aircraft at risk within 5 days.\n▸ FINANCIAL IMPACT — $420,000 to $610,000.\n▸ DECISIONS REQUIRED\n  1. AUTHORIZE: Expedite exchange valve from lessor · Owner: Parts Desk Lead · Deadline: 2 hours · Cost: $38,000\n  2. ESCALATE: Reassign rotation for affected aircraft · Owner: Maintenance Control · Deadline: 4 hours · Cost: $12,000\n  3. REVIEW: Lease-utilization commitment risk · Owner: Ops Director · Deadline: 1 day · Cost: $0\n▸ BNCA — Authorize the expedite order now to contain the AOG.\n▸ ESCALATION TRIGGER — Notify the lessor if the valve is not secured within 24 hours.',
];

test.setTimeout(90000);

test('Aerospace: AOG war room to strategist to executive portal', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  fs.mkdirSync(OUT, { recursive: true });
  let frame = 1;
  const shot = async (name) => {
    const id = String(frame++).padStart(3, '0');
    await page.screenshot({ path: path.join(OUT, `${id}-${name}.png`) });
    console.log(`CAPTURED ${id} ${name}`);
  };

  await stubWarRoom(page, ENGINES);

  await page.goto('/html/war-rooms/aerospace-maintenance-readiness.html',
    { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#fireBtn')).toBeVisible();
  await shot('war-room-landing');

  await page.locator('#sampleBtnAog').click();
  await page.waitForTimeout(600);
  await shot('aog-sample-loaded');

  await expect(page.locator('#escalateBtn')).toBeDisabled();
  await page.locator('#fireBtn').click();
  await expect(page.locator('#escalateBtn')).toBeEnabled({ timeout: 30000 });
  await expect(page.locator('#kpiEngines')).toHaveText('6/6');
  await expect(page.locator('#kpiRisk')).toHaveText('82/100');
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
