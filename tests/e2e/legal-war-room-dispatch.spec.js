// tests/e2e/legal-war-room-dispatch.spec.js
//
// Regression test for the Engine 06 App Dispatch panel in
// html/war-rooms/legal-war/legal-war-room.html.
//
// Commit 0e9d11e ("Import tsm-apps snapshot (222a2c8)") deleted the
// #dispatch06 wrapper, .dispatch-card, the dispatch-header opening, and the
// #dispatchIntro block, but left their matching closing </div> tags in
// place — leaving #dispatch06 entirely absent from the DOM. fireEngines()
// (and clearAll(), unguarded) then threw on
// document.getElementById('dispatch06').style.display, derailing the whole
// six-engine run with an uncaught TypeError after Engine 06 had already
// produced its dispatch text.
//
// This drives the real page end to end — load a sample, fire all six
// engines, confirm the dispatch panel actually renders with app cards, then
// Clear & Reset — and fails on any uncaught page error, not just a missing
// element.
//
// /api/legal/query is stubbed (not /api/war-room/stream — that SSE shape
// belongs to the other flagship war rooms; this page POSTs a plain
// {system, question} and expects {ok, answer} back, per GROQ in the page's
// own script and routes/... requireAnyAuth-gated handler in server.js).
// The stub never reaches the server, so no login is required for it to
// resolve, but TSM_SESSION_SECRET must still be set for the server to boot.

const { test, expect } = require('@playwright/test');

const ENGINE_TEXT = {
  1: `CASE TYPE: Employment
PARTIES: Plaintiff v. Employer Corp
KEY AMOUNTS: $450,000 claimed
CRITICAL DEADLINES:
1. Response due in 14 days
LITIGATION STAGE: Pre-filing
RISK SCORE: 68/100
DISPUTE STATUS: Active`,
  2: `PRIMARY LEGAL ISSUE: Wrongful termination
BREACH RISK: Moderate
LIABILITY EXPOSURE: $200K-$500K
KEY VIOLATIONS: Title VII
STATUTE OF LIMITATIONS: 180 days from incident
LEGAL RISK LEVEL: High`,
  3: `DAMAGES EXPOSURE: $450,000 - $600,000
SETTLEMENT RANGE: 40-60% of claimed damages
LITIGATION COST: $150,000 - $400,000
CASH FLOW IMPACT: Moderate
FINANCIAL RISK SCORE: 71/100
RESTATEMENT RISK: Low
RISK SCORE: 71/100
CRITICAL DEADLINES:
1. Mediation window opens in 21 days`,
  4: `RECOMMENDED ACTION: Early settlement negotiation
APPEAL STRATEGY: Preserve record, prepare parallel defense
DOCUMENTS NEEDED: Personnel file, termination memo
DEADLINE MAP: Response in 14 days; mediation in 21 days
RECOVERY PROBABILITY: 55%`,
  5: `**Immediate Next Steps:**
1. **Litigation Hold:** Preserve records — Legal — TODAY
**Staff Roles and Responsibilities:**
1. **Case Lead:** Oversee strategy
**Specialist Node Routing:**
• Employment Node: Review termination documentation
**BNCA — Best Next Course of Action:**
Begin settlement negotiation while preserving the litigation hold.
**Escalation Trigger:**
If settlement talks stall beyond 30 days.
**Confidence:** 90%`,
  6: `DISPATCH_INTRO: Five remediation pathways identified from the six-engine analysis of this employment matter.

APP: Employment Node
CATEGORY: Legal Operations
RANK: #1
IS_TOP: YES
HOW_TO_USE: Open the Employment Node intake tab. Enter the termination date and claimed violations. Generate the EEOC response template.
TAGS: EMPLOYMENT, EEOC, INTAKE

APP: Litigation Node
CATEGORY: Legal Operations
RANK: #2
IS_TOP: NO
HOW_TO_USE: Open the Exposure Assessment tab. Enter the damages figures and litigation stage.
TAGS: LITIGATION, EXPOSURE, MOTIONS

APP: Case Strategist
CATEGORY: Legal Operations
RANK: #3
IS_TOP: NO
HOW_TO_USE: Feed the war room output into Case Strategist for a unified matter strategy document.
TAGS: STRATEGY, SYNTHESIS, PARTNER

APP: Compliance Node
CATEGORY: Legal Operations
RANK: #4
IS_TOP: NO
HOW_TO_USE: Use the Compliance Audit tab to surface the exact policy checklist.
TAGS: COMPLIANCE, AUDIT, POLICY

APP: Chief Strategist
CATEGORY: Legal Operations
RANK: #5
IS_TOP: NO
HOW_TO_USE: Route the full six-engine package for cross-matter synthesis and executive relay.
TAGS: ESCALATION, EXECUTIVE, RELAY`,
};

async function stubLegalQuery(page) {
  await page.route('**/api/legal/query', async (route) => {
    const req = route.request();
    if (req.method() !== 'POST') return route.continue();
    let n = 1;
    try {
      const body = JSON.parse(req.postData() || '{}');
      const m = /ENGINE 0([1-6])/.exec(body.question || '');
      if (m) n = Number(m[1]);
    } catch (e) { /* default to engine 1 */ }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, answer: ENGINE_TEXT[n] }),
    });
  });
}

test.setTimeout(60000);

test('Legal War Room: fire all 6 engines, App Dispatch renders, Clear resets, no page errors', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await stubLegalQuery(page);

  await page.goto('/html/war-rooms/legal-war/legal-war-room.html', { waitUntil: 'domcontentloaded' });

  // Load a sample matter so fireBtn is enabled with real document text.
  await page.locator('#smp-complaint').click();
  await expect(page.locator('#smp-complaint')).toHaveClass(/loaded/);
  await expect(page.locator('#fireBtn')).toBeEnabled();

  // Fire all 6 engines.
  await page.locator('#fireBtn').click();
  await expect(page.locator('#spinner')).toBeVisible();

  for (let i = 1; i <= 6; i++) {
    await expect(page.locator(`#ps${i}`)).toHaveText('COMPLETE ✓', { timeout: 20000 });
  }

  // Spinner stops and the fire button re-enables once the run finishes.
  await expect(page.locator('#spinner')).toBeHidden();
  await expect(page.locator('#fireBtn')).toBeEnabled();

  // The regression: #dispatch06 must exist and actually become visible,
  // with the App Dispatch cards rendered inside it. The exact card count is
  // the page's own catalog-merge logic, not something this test should
  // pin down — assert shape and internal consistency instead, so a change
  // to the app catalog doesn't spuriously break this test.
  const dispatch06 = page.locator('#dispatch06');
  await expect(dispatch06).toBeVisible();

  const cardCount = await page.locator('#appCards .app-card').count();
  expect(cardCount).toBeGreaterThan(0);

  const appCountText = await page.locator('#appCount').textContent();
  const m = /✓\s*(\d+)\s*APPS RECOMMENDED/.exec(appCountText || '');
  expect(m, `#appCount text didn't match expected format: "${appCountText}"`).not.toBeNull();
  expect(Number(m[1])).toBe(cardCount);

  const introText = (await page.locator('#dispatchIntro').textContent() || '').trim();
  expect(introText.length).toBeGreaterThan(0);
  expect(introText).not.toContain('Analyzing 6-engine output');

  // Clear & Reset must not throw (clearAll() sets #dispatch06.style.display
  // directly, unguarded — this is the second crash site 0e9d11e opened up).
  await page.locator('button:has-text("CLEAR & RESET")').click();
  await expect(dispatch06).toBeHidden();
  await expect(page.locator('#fireBtn')).toBeDisabled();
  await expect(page.locator('#docPaste')).toHaveValue('');

  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toHaveLength(0);
});
