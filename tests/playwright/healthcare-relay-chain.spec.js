// tests/playwright/healthcare-relay-chain.spec.js
//
// Phase 1 vertical relay-chain audit (see docs/audit/phase1-healthcare-chain-audit.md
// for the full trace this spec is seeded from). Every payload shape below was
// copied from the actual writer function in source, not invented.
//
// UNLIKE finops, healthcare does NOT run doc-search -> war-room -> strategist
// -> exec -> sentinel as one line. Two separate paths exist:
//   Path A: doc-search -> hc-denial-war-room.html -- BROKEN, dead relay, no
//           reader anywhere in that file. Test 1 below documents this current
//           (broken) behavior so a future fix shows as a spec change, not a
//           silent pass.
//   Path B: node war rooms (hc-billing, hc-medical, etc.) -> TSM_WAR_ROOM_BRIEF
//           -> hc-main-strategist.html -> TSM_EXEC_RELAY -> executive-portal.html,
//           with a parallel auto-write of TSM_HEALTHCARE_STRATEGIST_RELAY for
//           Sentinel Center. This is the chain that's actually live for the
//           HonorHealth pilot.
//
// Payload shapes traced from:
//   nodeWarRoomBrief      <- html/healthcare/hc-billing/index.html relayToStrategist() ~line 737
//   strategistExecRelay   <- html/healthcare/hc-main-strategist.html escalateToExecPortal() ~line 1373
//   sentinelRelay         <- html/healthcare/hc-main-strategist.html sentinel-push block ~line 1045
//
// IMPORTANT: use html/healthcare/hc-main-strategist.html (the flat file), NOT
// html/healthcare/hc-main-strategist/index.html (a stub with no relay-write
// logic at all -- see audit doc for the autorun routing bug that hits the stub).
//
// Run: npx playwright test tests/playwright/healthcare-relay-chain.spec.js
// (needs `npm install` + `npx playwright install chromium` first.)

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173';

test.describe('Healthcare relay chain (Phase 1)', () => {

  test('[DOCUMENTED BROKEN] doc-search -> hc-denial-war-room: tsm_hc_docsearch_relay is never read', async ({ page }) => {
    const docSearchPayload = {
      ts: Date.now(),
      summary: 'DOCUMENT: eob-mesa-0417.pdf\nTYPE: EOB\nREF/CLAIM #: CLM-0334\nEXPOSURE: $3,800',
      doc: { fileName: 'eob-mesa-0417.pdf', documentType: 'EOB', invoiceNo: 'CLM-0334', amount: 3800 }
    };
    await page.addInitScript((payload) => {
      localStorage.setItem('tsm_hc_docsearch_relay', JSON.stringify(payload));
    }, docSearchPayload);

    await page.goto(`${BASE_URL}/html/healthcare/hc-denial-war-room.html`);

    // This assertion captures the CURRENT (broken) state on purpose: the page
    // never reads tsm_hc_docsearch_relay, so the seeded doc never appears
    // anywhere and the key is left sitting in localStorage, unconsumed.
    // If this test ever starts FAILING, that means someone wired up a reader
    // -- flip this spec to assert the fix instead of loosening it.
    await expect(page.locator('body')).not.toContainText('eob-mesa-0417.pdf');
    const stillThere = await page.evaluate(() => localStorage.getItem('tsm_hc_docsearch_relay'));
    expect(stillThere).not.toBeNull();
  });

  test('node war room -> strategist: TSM_WAR_ROOM_BRIEF populates the war-room banner', async ({ page }) => {
    const nodeWarRoomBrief = {
      sessionId: 'REL-TEST1',
      timestamp: new Date().toISOString(),
      engineOutputs: { 'HC-BILLING': 'Denial rate 18.4% vs 15% CMS threshold. CLM-0334 at risk, $3,800 timely-filing deadline in 48hrs.' },
      engine06: { narrative: 'Mesa denial spike driven by PR-96 and CO-29 codes; CLM-0334 requires immediate appeal to avoid write-off.', recommendations: [] },
      documentMeta: { ingestType: 'hc-billing', charCount: 142 }
    };
    await page.addInitScript((payload) => {
      sessionStorage.setItem('TSM_WAR_ROOM_BRIEF', JSON.stringify(payload));
      localStorage.setItem('TSM_WAR_ROOM_BRIEF', JSON.stringify(payload));
    }, nodeWarRoomBrief);

    await page.goto(`${BASE_URL}/html/healthcare/hc-main-strategist.html`);

    const banner = page.locator('#tsm-war-room-banner');
    await expect(banner).toContainText('REL-TEST1', { timeout: 5000 });
    await expect(banner).toContainText(/CLM-0334|Mesa denial spike/i);
  });

  test('strategist -> exec portal: TSM_EXEC_RELAY renders on the Strategist Reports tab', async ({ page }) => {
    const strategistExecRelay = {
      ts: Date.now(),
      enriched: true,
      sourceSnapshot: { revenueAtRisk: '$48,000', denialRate: '18.4%' },
      kpi: {},
      bnca: { revenuePosition: 'Revenue at risk $48,000 per latest Strategist sync.', denialIntel: 'Denial hotspot 18.4% — see Strategist session for detail.' },
      alerts: { decisions: [], urgent: ['CLM-0334 (CPT 93454, $3,800, Medicare CO-29 timely filing) — 48hr write-off deadline'] },
      sessionId: 'REL-TEST2',
      warRoomBrief: 'TOP ISSUE\nCLM-0334 timely-filing deadline in 48 hours, $3,800 exposure.\n\nIMMEDIATE ACTIONS\n1. File appeal today.\n2. Loop in Medicare liaison.\n\nPRIMARY ACTOR\nScottsdale billing office manager',
      dashSummary: 'Denial hotspot 18.4%',
      aiSummary: 'CLM-0334 requires immediate appeal.',
      stratReports: { executiveBrief: 'CLM-0334 timely-filing deadline in 48 hours.' },
      liveSignals: [{ severity: 'URGENT', title: 'CLM-0334 timely filing deadline', sub: '48hr write-off risk', source: 'HC-Billing · Scottsdale' }]
    };
    await page.addInitScript((payload) => {
      sessionStorage.setItem('TSM_EXEC_RELAY', JSON.stringify(payload));
      localStorage.setItem('TSM_EXEC_RELAY', JSON.stringify(payload));
    }, strategistExecRelay);

    await page.goto(`${BASE_URL}/html/healthcare/executive-portal.html`);

    // buildStratReportsTab() only runs when the Strategist Reports tab is
    // opened -- it does not populate on page load. Click through to it
    // rather than loosen the assertion to whatever's on the default tab.
    await page.locator('[data-tab="stratreports"]').click();

    const reportsContent = page.locator('#strat-reports-content');
    await expect(reportsContent).toContainText('REL-TEST2', { timeout: 5000 });
    await expect(reportsContent).toContainText(/CLM-0334/);
  });

  test('strategist -> Sentinel Center: TSM_HEALTHCARE_STRATEGIST_RELAY renders in the vertical row', async ({ page }) => {
    const sentinelRelay = {
      generatedAt: new Date().toISOString(),
      anomalies: [{
        id: 'hc-test1',
        title: 'HonorHealth Strategist Synthesis',
        severity: 'HIGH',
        exposure: 48000,
        confidence: 78,
        rootCause: 'Denial spike: PR-96 and CO-29 codes concentrated at Mesa office',
        recommendedAction: 'File CLM-0334 appeal before 48hr timely-filing deadline (Owner: Scottsdale billing)'
      }]
    };
    await page.addInitScript((payload) => {
      localStorage.setItem('TSM_HEALTHCARE_STRATEGIST_RELAY', JSON.stringify(payload));
    }, sentinelRelay);

    await page.goto(`${BASE_URL}/html/sentinel-center.html`);

    // Sentinel renders one .vrow per subscribed vertical, keyed by
    // data-vid -- not a generic text-match locator, to avoid a false pass
    // if "Healthcare" appears elsewhere on the page (e.g. a locked-row teaser).
    const hcRow = page.locator('.vrow[data-vid="healthcare"]');
    await expect(hcRow).toBeVisible({ timeout: 5000 });
    await expect(hcRow.locator('.exposure')).toContainText('48,000');

    // Sentinel's own EXEC_PORTAL_PATHS.healthcare points at
    // /html/war-rooms/healthcare/executive-portal.html, which does not exist
    // in this repo (real file is /html/healthcare/executive-portal.html).
    // This assertion documents the current broken link rather than skipping it.
    const execLink = hcRow.locator('.exec-link');
    if (await execLink.count()) {
      await expect(execLink).toHaveAttribute('href', /\/html\/war-rooms\/healthcare\/executive-portal\.html/);
    }
  });

});
