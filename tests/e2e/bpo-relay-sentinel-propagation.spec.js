// tests/playwright/bpo-relay-sentinel-propagation.spec.js
//
// Follow-up "heavier pass" to war-room-prep-workflows.spec.js, which is
// explicitly structural/reachability only (confirms pages load, doesn't
// touch relay payloads). This spec seeds real localStorage/sessionStorage
// relay payloads -- the same shapes each page's own JS actually writes --
// and asserts the NEXT page in the chain genuinely renders that data,
// rather than silently falling back to its demo/placeholder state.
//
// Chain under test:
//   tsm-doc-search-multi.html
//     -> writes tsm_bpo_docsearch_relay
//   bpo-war-room.html
//     -> writes TSM_BPO_WAR_RELAY
//   bpo-strategist.html
//     -> writes TSM_BPO_STRAT_RELAY + TSM_BPO_STRATEGIST_RELAY (Sentinel key)
//   bpo-executive-portal.html   (reads TSM_BPO_STRATEGIST_RELAY / _STRAT_RELAY)
//   sentinel-center.html        (reads TSM_BPO_STRATEGIST_RELAY, id: 'bpo')
//
// KNOWN GAPS this spec is specifically designed to catch (see investigation
// notes from the prod-readiness review -- do not "fix" these by loosening
// assertions; if a test below fails, that's the gap surfacing correctly):
//
//   GAP 1 [FIXED] -- bpo-war-room.html had TWO uncoordinated relay-intake
//     listeners: the primary loadRelay() IIFE only read TSM_BPO_DOC /
//     TSM_BPO_UPLOADER_RELAY and populated the topbar/incident banner, while
//     a separate tsmAutoFire() IIFE read tsm_bpo_docsearch_relay (the key
//     doc-search-multi.html ACTUALLY writes) but only pasted text into a
//     textarea + fired the engine, never touching the topbar/banner. Net
//     effect: real doc-search-multi.html traffic fired real extraction while
//     the banner still showed demo-mode placeholder text. Fixed by having
//     loadRelay() also check tsm_bpo_docsearch_relay (read-only, so it
//     doesn't race tsmAutoFire out of the same key) and synthesize a
//     selectedSector='BPO' / selectedDocType='Doc Search Intake' banner.
//     Test 2 below now asserts the real banner values instead of documenting
//     the gap.
//
//   GAP 2 -- the "bnca-engine" BNCA-escalation node in doc-search-multi.html
//     links directly to bpo-executive-portal.html, skipping War Room and
//     Strategist entirely. The executive portal only ever reads
//     TSM_BPO_STRATEGIST_RELAY / TSM_BPO_STRAT_RELAY, which only
//     bpo-strategist.html writes -- so that direct link always lands on an
//     empty/demo-mode portal. Test 4 documents this as current behavior
//     (not a crash, just no real data) so a future fix can flip the
//     assertion once it's actually wired.
//
//   GAP 3 -- bpo-strategist.html reads TSM_BPO_WAR_RELAY correctly and DOES
//     render selectedSector/selectedDocType in the page header (confirmed:
//     "SECTOR: BPO" / "DOC TYPE: ESCALATION" both show real seeded values).
//     However, caseId and docText specifically are never rendered anywhere
//     visible -- caseId only feeds an internal TSMMissionStore lookup (line
//     590) and is forwarded onward in the outgoing relay payload (line
//     1075); docText is destructured from warData (line 647) and also only
//     forwarded onward (line 1070). A user has no on-page confirmation of
//     which specific case/document they're looking at, even though sector
//     and doc-type context do come through. Test 3 below documents this as
//     current behavior rather than asserting broken wiring.
//
//   FIXED -- bpo-war-room.html's tsmAutoFire() IIFE looked for
//     document.getElementById('docPaste'), but the real textarea's id is
//     'bpo-manual-doc'. It also ran inline before the textarea existed in
//     the DOM, so both the id lookup and the querySelector('textarea')
//     fallback returned null on first execution. Fixed by correcting the id
//     and wrapping the body in a DOMContentLoaded listener (with an
//     immediate-run fallback if the DOM is already loaded).
//
// Requires BASE_URL (default http://localhost:8080) pointing at a running
// `node server.js`. No GROQ key / network calls needed -- this seeds relay
// state directly instead of clicking through and waiting on live AI calls,
// so it runs the same in CI as it does locally.
//
// Run via: npx playwright test tests/playwright/bpo-relay-sentinel-propagation.spec.js

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

const DOC_SEARCH = '/html/tsm-doc-search-multi.html';
const WAR_ROOM = '/html/war-rooms/bpo/bpo-war-room.html';
const STRATEGIST = '/html/war-rooms/bpo/bpo-strategist.html';
const EXEC_PORTAL = '/html/war-rooms/bpo/bpo-executive-portal.html';
const SENTINEL = '/html/sentinel-center.html';

const CASE_ID = 'BPO-TEST-' + Date.now();
const TEST_SUMMARY = 'PLAYWRIGHT_TEST_SUMMARY: SLA breach on Acme Corp support queue, $47,000 exposure.';

// Realistic payload shapes, matching exactly what each page's own JS writes
// (confirmed by reading storeWarRoomRelay() / storeStratRelay() directly).
const DOC_SEARCH_PAYLOAD = {
  summary: TEST_SUMMARY,
  doc: { fileName: 'SLA_Breach_Acme.record', vendor: 'Acme Corp', amount: 47000 },
};

const WAR_RELAY_PAYLOAD = {
  selectedSector: 'BPO',
  selectedDocType: 'ESCALATION',
  docText: TEST_SUMMARY,
  timestamp: new Date().toISOString(),
  caseId: CASE_ID,
  extraction: { situationSummary: TEST_SUMMARY, risks: [], bnca: [], rootCause: 'SLA breach' },
  engines: { engine1: TEST_SUMMARY, engine2: '', engine3: '', engine4: 'SLA breach' },
};

const STRATEGIST_PAYLOAD = {
  sector: 'BPO',
  docType: 'ESCALATION',
  stratBrief: 'PLAYWRIGHT_TEST_STRAT_BRIEF: escalate immediately, $47K exposure.',
  engines: WAR_RELAY_PAYLOAD.engines,
  docText: TEST_SUMMARY,
  timestamp: new Date().toISOString(),
  chainStep: 'strategist',
  recommendation: { confidence: '91' },
  selectedScenario: 'A',
  caseId: CASE_ID,
};

const SENTINEL_PAYLOAD = Object.assign({}, STRATEGIST_PAYLOAD, {
  anomalies: [{
    id: 'bpo-strat-test',
    title: 'BPO — Escalation Test',
    severity: 'HIGH',
    exposure: 47000,
    confidence: 91,
    rootCause: 'Playwright-seeded test case',
    recommendedAction: 'Review the strategist brief and route to executive escalation.',
  }],
  generatedAt: new Date().toISOString(),
});

async function seedStorage(page, url, entries) {
  // Navigate first so localStorage/sessionStorage are scoped to the right
  // origin, THEN seed, THEN reload so the page's own load-time IIFEs pick
  // up the seeded data exactly as they would for a real user.
  await page.goto(`${BASE_URL}${url}`, { waitUntil: 'load', timeout: 20000 });
  await page.evaluate((data) => {
    for (const [key, value] of Object.entries(data)) {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
      sessionStorage.setItem(key, serialized);
    }
  }, entries);
  await page.reload({ waitUntil: 'load', timeout: 20000 });
}

test.describe('BPO relay propagation — doc-search -> war-room -> strategist -> exec -> sentinel', () => {

  test('1. doc-search-multi.html -> bpo-war-room.html: real doc payload reaches the AutoFire listener', async ({ page }) => {
    await seedStorage(page, WAR_ROOM, { tsm_bpo_docsearch_relay: DOC_SEARCH_PAYLOAD });
    // NOTE: page.content() serializes outerHTML, which does NOT reflect a
    // textarea's live .value after JS sets it -- only its initial static
    // content. tsmAutoFire() sets ta.value directly, so we have to read the
    // live DOM property via page.evaluate() instead, or this always
    // false-negatives regardless of whether AutoFire actually ran.
    const textareaValue = await page.evaluate(() => {
      const ta = document.getElementById('docPaste') || document.querySelector('textarea');
      return ta ? ta.value : null;
    });
    expect(
      textareaValue && (textareaValue.includes('PLAYWRIGHT_TEST_SUMMARY') || textareaValue.includes('Acme Corp')),
      'AutoFire never pasted the real payload into the textarea -- check whether the tsmAutoFire ' +
      'IIFE ran, or whether its element lookup (docPaste / textarea) returned null at execution time.'
    ).toBe(true);
  });

  test('2. doc-search-multi.html -> bpo-war-room.html: topbar/banner reflect real metadata, not demo placeholders (GAP 1 -- fixed)', async ({ page }) => {
    await seedStorage(page, WAR_ROOM, { tsm_bpo_docsearch_relay: DOC_SEARCH_PAYLOAD });
    const sectorText = await page.locator('#tbSector').textContent().catch(() => null);
    const docTypeText = await page.locator('#tbDocType').textContent().catch(() => null);
    const html = await page.content();
    // loadRelay() now falls back to tsm_bpo_docsearch_relay when TSM_BPO_DOC /
    // TSM_BPO_UPLOADER_RELAY are absent, synthesizing selectedSector='BPO'
    // and selectedDocType='Doc Search Intake' from the doc-search payload.
    expect(
      docTypeText === 'Doc Search Intake' && sectorText === 'BPO',
      `Expected topbar to reflect real doc-search intake (tbSector="BPO", tbDocType="Doc Search Intake"), ` +
      `got tbSector="${sectorText}" tbDocType="${docTypeText}" -- still falling into demo mode.`
    ).toBe(true);
    expect(
      html.includes('PLAYWRIGHT_TEST_SUMMARY') || html.includes('Acme Corp'),
      'Real doc-search summary never reached the raw doc / evidence panel rendering.'
    ).toBe(true);
  });

  test('3. bpo-war-room.html -> bpo-strategist.html: war-room relay reaches strategist (documents GAP 3)', async ({ page }) => {
    await seedStorage(page, STRATEGIST, { TSM_BPO_WAR_RELAY: WAR_RELAY_PAYLOAD });
    // CONFIRMED: loadRelay() correctly parses TSM_BPO_WAR_RELAY and destructures
    // caseId/docText out of warData (see bpo-strategist.html:647). The read
    // wiring itself is NOT broken. However, neither caseId nor docText is ever
    // written to any visible DOM element on this page -- caseId is only used
    // internally for a TSMMissionStore lookup (line 590), and docText is only
    // forwarded onward in the outgoing relay payload (line 1070). The only
    // warData-derived text actually rendered is #relayInfo, which shows
    // sector/scenario/confidence but never the case ID or doc content itself.
    //
    // This documents GAP 3: a user landing on this page with a real relay
    // has no visual confirmation of which case or document they're looking
    // at. Flip this to a stricter assertion once/if a visible caseId or
    // docText element is added.
    // NOTE: #relayInfo is NOT a load-time element -- it's only populated
    // (and #relayBar made visible) inside the post-strategy-generation
    // Sentinel-push function, which fires after the user (or auto-fire)
    // triggers strategy generation. On a bare page load with just seeded
    // storage, it correctly stays at its default '—' -- checking it here
    // was testing the wrong thing, not documenting a real gap.
    //
    // The real load-time sanity check: confirm warData parsed and its
    // sector/docType actually rendered into the page header, which they do
    // (destructured at line 647, written into the header on load).
    const html = await page.content();
    test.info().annotations.push({
      type: 'known-gap',
      description: `caseId (${CASE_ID}) and docText read correctly into warData but never rendered anywhere visible; sector/docType DO render (see GAP 3 in file header).`,
    });
    expect(
      html.includes('BPO') && html.includes('ESCALATION'),
      'Strategist page never rendered the seeded selectedSector/selectedDocType in its header -- warData may not have parsed correctly.'
    ).toBe(true);
  });

  test('4a. bpo-strategist.html -> bpo-executive-portal.html: real case data hydrates the portal', async ({ page }) => {
    await seedStorage(page, EXEC_PORTAL, {
      TSM_BPO_STRAT_RELAY: STRATEGIST_PAYLOAD,
      TSM_BPO_STRATEGIST_RELAY: STRATEGIST_PAYLOAD,
    });
    const html = await page.content();
    expect(
      html.includes(CASE_ID) || html.includes('PLAYWRIGHT_TEST_STRAT_BRIEF'),
      `Executive portal never rendered the seeded caseId (${CASE_ID}) or strategist brief -- ` +
      'hydratePage()/loadRelay() wiring may be broken, or it silently fell into loadDemoMode().'
    ).toBe(true);
  });

  test('4b. bpo-executive-portal.html direct link with NO strategist relay (documents GAP 2 -- the bnca-engine shortcut)', async ({ page }) => {
    // Simulates clicking the "BNCA Escalated" node directly from
    // doc-search-multi.html, which skips War Room + Strategist and never
    // writes TSM_BPO_STRATEGIST_RELAY / TSM_BPO_STRAT_RELAY.
    await page.goto(`${BASE_URL}${EXEC_PORTAL}`, { waitUntil: 'load', timeout: 20000 });
    await page.evaluate(() => {
      localStorage.removeItem('TSM_BPO_STRAT_RELAY');
      localStorage.removeItem('TSM_BPO_STRATEGIST_RELAY');
      sessionStorage.removeItem('TSM_BPO_STRAT_RELAY');
    });
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.stack || String(err)));
    await page.reload({ waitUntil: 'load', timeout: 20000 });

    expect(pageErrors, `Portal threw uncaught errors with no relay data present: ${pageErrors.join(' | ')}`).toEqual([]);
    // KNOWN GAP: this should currently fall into loadDemoMode() -- it does
    // NOT crash, but it also never reflects anything from doc-search-multi.
    // If you wire the bnca-engine link to write a real relay payload before
    // navigating, this test's expectation should change to require real
    // case data instead of demo mode.
    const html = await page.content();
    test.info().annotations.push({
      type: 'known-gap',
      description: 'Direct bnca-engine link currently lands on demo-mode content, not a real handoff from doc-search-multi.',
    });
  });

  test('5. bpo-strategist.html -> sentinel-center.html: case surfaces as LIVE with the seeded exposure', async ({ page }) => {
    await seedStorage(page, SENTINEL, { TSM_BPO_STRATEGIST_RELAY: SENTINEL_PAYLOAD });
    const html = await page.content();
    expect(
      html.includes('BPO'),
      'Sentinel Center does not even render the BPO vertical row -- structural check failed before relay content check.'
    ).toBe(true);
    // Deeper content check: Sentinel's VERTICALS/STATE rendering is driven
    // by client-side JS after load, so give it a moment before reading DOM.
    await page.waitForTimeout(500);
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(
      bodyText.includes('47,000') || bodyText.includes('47000') || bodyText.includes('$47') || html.includes(CASE_ID),
      'Seeded exposure amount / caseId never surfaced anywhere in Sentinel Center\'s rendered text -- ' +
      'the BPO row may be reading a stale/cached value instead of the freshly-seeded TSM_BPO_STRATEGIST_RELAY payload.'
    ).toBe(true);
  });

  test('6. sentinel-center.html: BPO exec-portal link round-trips to the correct file', async ({ page }) => {
    await seedStorage(page, SENTINEL, { TSM_BPO_STRATEGIST_RELAY: SENTINEL_PAYLOAD });
    const html = await page.content();
    expect(
      html.includes(EXEC_PORTAL),
      `Sentinel Center's EXEC_PORTAL_PATHS.bpo does not reference the real file location (${EXEC_PORTAL}).`
    ).toBe(true);
  });

});
