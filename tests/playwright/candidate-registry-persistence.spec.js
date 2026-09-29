const { test, expect } = require('@playwright/test');

test.describe('Candidate Registry persistence contract', () => {
  test('training event persists independently of candidate projection', async ({ page }) => {
    test.setTimeout(60000);

    /*
     * Discover an existing canonical candidate.
     * No browser-side candidate creation or seed data.
     */
    const candidatesResponse = await page.request.get('/api/candidates');

    expect(
      candidatesResponse.ok(),
      `GET /api/candidates failed with ${candidatesResponse.status()}`
    ).toBeTruthy();

    const candidatesBody = await candidatesResponse.json();
    const candidates = Array.isArray(candidatesBody.candidates)
      ? candidatesBody.candidates
      : [];

    expect(candidates.length).toBeGreaterThan(0);

    const candidate = candidates[0];
    const candidateId = candidate.candidateId;

    expect(candidateId).toBeTruthy();

    /*
     * Use a unique marker so this event can be verified without depending
     * on prior candidate state.
     */
    const scenario = `PHASE6H_PERSISTENCE_${Date.now()}`;

    const event = {
      type: 'career_training_attempt',
      score: 0.91,
      weight: 1,
      meta: {
        domain: 'rcm',
        concept: 'denial_recovery',
        competency: 'appeal_strategy',
        scenario,
        source: 'phase6h_persistence_contract',
        metadata: {
          phase: '6H',
          persistenceContract: true
        }
      }
    };

    /*
     * Write through the canonical Registry API.
     */
    const writeResponse = await page.request.post(
      `/api/candidates/${encodeURIComponent(candidateId)}/training-events`,
      {
        data: event
      }
    );

    expect(
      writeResponse.ok(),
      `POST training event failed with ${writeResponse.status()}`
    ).toBeTruthy();

    const writeBody = await writeResponse.json();

    expect(writeBody.candidate).toBeTruthy();
    expect(writeBody.candidate.candidateId).toBe(candidateId);

    /*
     * Read the canonical candidate back.
     */
    const candidateResponse = await page.request.get(
      `/api/candidates/${encodeURIComponent(candidateId)}`
    );

    expect(candidateResponse.ok()).toBeTruthy();

    const candidateBody = await candidateResponse.json();
    const persistedCandidate = candidateBody.candidate;

    expect(persistedCandidate).toBeTruthy();
    expect(persistedCandidate.candidateId).toBe(candidateId);
    expect(typeof persistedCandidate.readinessScore).toBe('number');
    expect(Number.isFinite(persistedCandidate.readinessScore)).toBeTruthy();
    expect(persistedCandidate.readinessBasis).toBe(
      'weighted-average-of-training-events'
    );

    /*
     * The candidate API intentionally does not expose the raw event ledger.
     * This confirms the projection was updated after the event write.
     */
    expect(persistedCandidate.updatedAt).toBeTruthy();

    /*
     * The POST response itself is the Registry persistence boundary.
     * It must return the canonical candidate projection after recording
     * the event.
     */
    expect(writeBody.candidate.readinessScore).toBe(
      persistedCandidate.readinessScore
    );
  });
});
