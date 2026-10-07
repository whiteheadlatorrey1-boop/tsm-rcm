const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { stubWarRoom } = require('./helpers/stub-war-room');

const OUT = path.resolve(__dirname, 'demo', 'screenshots', 'bess-flagship');
const RELAY_KEY = 'TSM_HONEYWELL_BESS_RELAY';
const readRelay = (page) => page.evaluate(
  (k) => sessionStorage.getItem(k) || localStorage.getItem(k), RELAY_KEY);

const ENGINES = [
  'INCIDENT TYPE: off-gas alarm escalating toward thermal event in BESS Container 7. Affected: 2 of 12 containers, 240 MWh site.',
  'KPI_JSON: {"leadTimeEstimate": "2-4 hours"}\nCAPACITY LOSS: 17% of site output offline. Grid commitment shortfall of 40 MWh/day.',
  'ROOT CAUSE: cell-level degradation with cooling loop fault; adjacent containers share exposure.',
  'KPI_JSON: {"totalExposureLow": 400000, "totalExposureHigh": 600000}\nEstimated planning range (assumption, not a confirmed cost): $400K-$600K.',
  '1. AUTHORIZE: Isolate Container 7 and suspend charging · Owner: Site Operations Lead · Deadline: 2 hours · Cost: NOT QUANTIFIED',
  'KPI_JSON: {"riskScore": 71, "downtimeEstimate": "12-24 hours to re-energization decision"}\n▸ INCIDENT SUMMARY — Off-gas alarm in Container 7 risks a thermal event.\n▸ FINANCIAL IMPACT — $400,000 to $600,000 (estimate).\n▸ DECISIONS REQUIRED\n  1. AUTHORIZE: Isolate Container 7 · Owner: Site Operations Lead · Deadline: 2 hours · Cost: NOT QUANTIFIED\n  2. ESCALATE: Notify grid operator and insurer · Owner: Operations Director · Deadline: 4 hours · Cost: NOT QUANTIFIED\n  3. REVIEW: Adjacent container inspection · Owner: Reliability Engineer · Deadline: 1 day · Cost: NOT QUANTIFIED\n▸ BNCA — Isolate Container 7 now.\n▸ ESCALATION TRIGGER — Notify the board if temperature crosses the alarm threshold.',
];

test.setTimeout(90000);

test('BESS: gigafactory war room to strategist to executive portal', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  fs.mkdirSync(OUT, { recursive: true });
  let frame = 1;
  const shot = async (name) => {
    const id = String(frame++).padStart(3, '0');
    await page.screenshot({ path: path.join(OUT, `${id}-${name}.png`) });
    console.log(`CAPTURED ${id} ${name}`);
  };

  await stubWarRoom(page, ENGINES);
  await page.goto('/html/war-rooms/bess-gigafactory-incident.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#fireBtn')).toBeVisible();
  await shot('war-room-landing');

  await page.locator('#scenBessBtn').click();
  await page.locator('#sampleBtn').click();
  await page.waitForTimeout(600);
  await shot('bess-sample-loaded');

  await expect(page.locator('#escalateBtn')).toBeDisabled();
  await page.locator('#fireBtn').click();
  await expect(page.locator('#escalateBtn')).toBeEnabled({ timeout: 30000 });
  await expect(page.locator('#kpiEngines')).toHaveText('6/6');
  await expect(page.locator('#kpiRisk')).toHaveText('71/100');
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
