const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { stubWarRoom } = require('./helpers/stub-war-room');

const OUT = path.resolve(__dirname, 'demo', 'screenshots', 'cascade-flagship');
const RELAY_KEY = 'TSM_HONEYWELL_CASCADE_RELAY';
const readRelay = (page) => page.evaluate(
  (k) => sessionStorage.getItem(k) || localStorage.getItem(k), RELAY_KEY);

const mkRelay = (source, title, text, lo, hi) => ({
  source,
  timestamp: '2026-10-06T14:00:00.000Z',
  docText: 'Seeded source relay for cascade capture.',
  kpis: { exposure: { totalExposureLow: lo, totalExposureHigh: hi } },
  outputs: [
    { engine: 1, title, text },
    { engine: 4, title: 'Financial Exposure', text: `KPI_JSON: {"totalExposureLow": ${lo}, "totalExposureHigh": ${hi}}` },
  ],
});
const SUPPLIER = mkRelay('supplier', 'Supplier Signal Intelligence',
  'Sole-source castings supplier declared force majeure; 6 weeks of supply at risk for turbine housings.', 600000, 1100000);
const PLANT = mkRelay('plant', 'Plant Incident Intelligence',
  'Assembly line 3 runs at 55% capacity; buffer stock of turbine housings covers 9 days.', 800000, 1500000);

const ENGINES = [
  'Supplier force majeure on turbine housings compounds with reduced Line 3 capacity; combined buffer is under 9 days.',
  'KPI_JSON: {"leadTimeEstimate": "9 days"}\nLine 3 and two dependent product lines halt once buffer stock is exhausted.',
  'CURRENT STAGE: supplier disruption propagating to plant output. ESCALATION RISK: 60% probability of a line stoppage within 14 days.',
  'KPI_JSON: {"totalExposureLow": 1400000, "totalExposureHigh": 2600000}\nCombined supply and production exposure is roughly $1.4M-$2.6M.',
  '1. AUTHORIZE: Qualify alternate castings supplier · Owner: Procurement Director · Deadline: 3 days · Cost: $90,000',
  'KPI_JSON: {"riskScore": 79}\n▸ INCIDENT SUMMARY — Supplier failure and reduced plant capacity compound into a likely line stoppage.\n▸ FINANCIAL IMPACT — $1,400,000 to $2,600,000.\n▸ DECISIONS REQUIRED\n  1. AUTHORIZE: Qualify alternate supplier · Owner: Procurement Director · Deadline: 3 days · Cost: $90,000\n  2. ESCALATE: Prioritize remaining buffer stock to top customers · Owner: Plant Manager · Deadline: 2 days · Cost: $15,000\n  3. REVIEW: Customer delivery commitments · Owner: Commercial Director · Deadline: 5 days · Cost: $0\n▸ BNCA — Start alternate-supplier qualification now.\n▸ ESCALATION TRIGGER — Notify the board if buffer stock falls below 5 days.',
];

test.setTimeout(90000);

test('Cascade: supplier + plant relays to strategist to executive portal', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  fs.mkdirSync(OUT, { recursive: true });
  let frame = 1;
  const shot = async (name) => {
    const id = String(frame++).padStart(3, '0');
    await page.screenshot({ path: path.join(OUT, `${id}-${name}.png`) });
    console.log(`CAPTURED ${id} ${name}`);
  };

  await page.addInitScript(({ s, p }) => {
    try {
      if (!localStorage.getItem('TSM_HONEYWELL_SUPPLIER_RELAY')) localStorage.setItem('TSM_HONEYWELL_SUPPLIER_RELAY', JSON.stringify(s));
      if (!localStorage.getItem('TSM_HONEYWELL_PLANT_RELAY')) localStorage.setItem('TSM_HONEYWELL_PLANT_RELAY', JSON.stringify(p));
    } catch (e) {}
  }, { s: SUPPLIER, p: PLANT });

  await stubWarRoom(page, ENGINES);
  await page.goto('/html/war-rooms/honeywell-cross-domain-cascade.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#refreshRelaysBtn').click();
  await expect(page.locator('#fireBtn')).toBeEnabled({ timeout: 10000 });
  await page.waitForTimeout(800);
  await shot('source-relays-ready');

  await expect(page.locator('#escalateBtn')).toBeDisabled();
  await page.locator('#fireBtn').click();
  await expect(page.locator('#escalateBtn')).toBeEnabled({ timeout: 30000 });
  await expect(page.locator('#kpiEngines')).toHaveText('6/6');
  await expect(page.locator('#kpiRisk')).toHaveText('79/100');
  await page.waitForTimeout(800);
  await shot('cascade-engines-complete');

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
