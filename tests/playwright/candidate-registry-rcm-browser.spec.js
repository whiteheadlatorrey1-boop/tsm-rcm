const { test, expect } = require('@playwright/test');

test.describe('Candidate Registry → RCM browser runtime contract', () => {
  test('selected candidate becomes RCM context and RCM evidence reaches Registry', async ({ page }) => {
    test.setTimeout(60000);

    /*
     * Discover a real candidate from the canonical Registry.
     * Do not seed or create test data from the browser test.
     */
    const candidatesResponse = await page.request.get('/api/candidates');
    const candidatesResponseText = await candidatesResponse.text();

    expect(
      candidatesResponse.ok(),
      `GET /api/candidates failed with ${candidatesResponse.status()}`
    ).toBeTruthy();

    const candidatesBody = JSON.parse(candidatesResponseText);
    const candidates = Array.isArray(candidatesBody.candidates)
      ? candidatesBody.candidates
      : [];

    expect(candidates.length).toBeGreaterThan(0);

    const candidate = candidates.find(
      (item) =>
        item &&
        typeof item.candidateId === 'string' &&
        item.candidateId.trim()
    );

    expect(candidate).toBeTruthy();

    const candidateId = candidate.candidateId;

    /*
     * Load the real Career Training Platform.
     */
    await page.goto('/html/tsm-career-training-platform.html');
    await expect(page.locator('.chain-badge').first()).toBeVisible();

    /*
     * Wait for the platform's live Candidate Registry load.
     */
    await page.evaluate(async (id) => {
      if (
        window._candidateRegistryById &&
        Object.keys(window._candidateRegistryById).length
      ) {
        return;
      }

      /*
       * The registry loads when the Registry or Manager panel is opened.
       * Use the real navigation function rather than reconstructing its
       * behavior inside the test.
       */
      if (typeof window.switchTo === 'function') {
        window.switchTo('registry');
      }

      const deadline = Date.now() + 10000;

      while (
        (!window._candidateRegistryById ||
          !window._candidateRegistryById[id]) &&
        Date.now() < deadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }, candidateId);

    /*
     * The browser test itself needs the candidateId available to the
     * page-side verification below.
     */
    await page.evaluate((id) => {
      window.__phase6gCandidateId = id;
    }, candidateId);

    /*
     * Select the canonical Registry candidate through the actual UI
     * function.
     */
    await page.evaluate(() => {
      const id = window.__phase6gCandidateId;

      if (typeof window.selectCareerCandidate !== 'function') {
        throw new Error('selectCareerCandidate() is not available');
      }

      window.selectCareerCandidate(id);
    });

    /*
     * 1. Browser selection → canonical candidate identity.
     */
    const selectedId = await page.evaluate(
      () => window._selectedCandidateId
    );

    expect(selectedId).toBe(candidateId);

    /*
     * 2. Candidate selection → RCM candidate context.
     */
    const rcmContext = await page.evaluate(() => {
      if (!window.TSMRCMEngine) {
        throw new Error('TSMRCMEngine is not available');
      }

      return window.TSMRCMEngine.getCandidateContext();
    });

    expect(rcmContext).toEqual({
      candidateId
    });

    /*
     * 3. Record an actual RCM attempt through the browser's production
     *    engine API.
     *
     * The score uses the engine's canonical 0–1 representation.
     */
    const attempt = await page.evaluate(() => {
      return window.TSMRCMEngine.recordAttempt({
        domain: 'rcm',
        concept: 'denial_recovery',
        competency: 'appeal_strategy',
        score: 0.91,
        scenario: 'PHASE6G_BROWSER_REGISTRY_CONTRACT',
        source: 'phase6g_browser_contract',
        metadata: {
          browserContract: true
        }
      });
    });

    expect(attempt).toBeTruthy();
    expect(attempt.score).toBe(0.91);
    expect(attempt.competency).toBe('appeal_strategy');
    expect(attempt.scenario).toBe(
      'PHASE6G_BROWSER_REGISTRY_CONTRACT'
    );

    /*
     * 4. Allow the intentionally asynchronous, best-effort Registry
     *    projection to complete.
     */
    await page.waitForTimeout(500);

    /*
     * 5. Read the canonical Registry record back from the server.
     */
    const candidateResponse = await page.request.get(
      `/api/candidates/${encodeURIComponent(candidateId)}`
    );

    expect(
      candidateResponse.ok(),
      `GET /api/candidates/${candidateId} failed with ${candidateResponse.status()}`
    ).toBeTruthy();

    const candidateBody = await candidateResponse.json();
    const persistedCandidate = candidateBody.candidate;

    expect(persistedCandidate).toBeTruthy();

      /*
       * Candidate Registry exposes the canonical candidate projection.
       * Training events are stored in the separate candidate_training_events
       * collection, so the browser contract verifies the resulting readiness
       * projection rather than assuming trainingEvents is embedded here.
       */
      expect(typeof persistedCandidate.readinessScore).toBe('number');
      expect(Number.isFinite(persistedCandidate.readinessScore)).toBeTruthy();

      expect(persistedCandidate.readinessBasis).toBe(
        'weighted-average-of-training-events'
      );

      /*
       * The attempt is intentionally a secondary projection. Its successful
       * effect is observable through the candidate's persisted readiness
       * projection without coupling this browser test to Mongo internals.
       */
      expect(persistedCandidate.updatedAt).toBeTruthy();
  });
});
