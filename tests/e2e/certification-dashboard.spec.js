// tests/e2e/certification-dashboard.spec.js
//
// Regression test for html/workforce/certification-dashboard.html — the
// read-only certification evidence dashboard over GET
// /api/candidates/evidence-overview (routes/candidate-registry.js).
//
// Three real cases, all against the actual page:
//   1. No session at all — GET /api/candidates/evidence-overview now
//      requires an authenticated staff session (routes/candidate-registry.js),
//      so the page must show a labeled "sign in to view" state rather than
//      the registry-unavailable message (that message now only applies
//      once a staff session is actually reachable).
//   2. An authenticated staff session but no MONGODB_URI configured (the
//      real state of this sandbox) — the page must show its labeled,
//      honest empty/unavailable state, not a blank page or a silently-
//      swallowed error.
//   3. A stubbed fetch response with fixture candidates — the table must
//      render the right row count and flag the unbacked-score case
//      (nonzero readinessScore with zero CSA ledger entries) distinctly
//      from the backed and zero-score cases.

const { test, expect } = require('@playwright/test');

test.setTimeout(30000);

const ADMIN_PASSWORD = process.env.TSM_ADMIN_PASSWORD || 'test-admin-pw';

test('Certification dashboard: no session shows "sign in to view", zero page errors', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto('/html/workforce/certification-dashboard.html', { waitUntil: 'networkidle' });

  await expect(page.locator('.empty-state .title')).toHaveText('Sign in to view');
  await expect(page.locator('table')).toHaveCount(0);

  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toHaveLength(0);
});

test('Certification dashboard: signed-in staff, no-DB state is labeled honestly, zero page errors', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  const loginRes = await page.request.post('/api/auth/login', { data: { password: ADMIN_PASSWORD } });
  expect(loginRes.ok(), 'admin login succeeds').toBeTruthy();

  await page.goto('/html/workforce/certification-dashboard.html', { waitUntil: 'networkidle' });

  await expect(page.locator('.empty-state .title')).toHaveText('Candidate registry unavailable');
  await expect(page.locator('.empty-state .detail')).toContainText('MONGODB_URI');
  await expect(page.locator('table')).toHaveCount(0);

  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toHaveLength(0);
});

test('Certification dashboard: stubbed candidates render rows and flag unbacked scores, zero page errors', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.route('**/api/candidates/evidence-overview', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ok: true,
      candidates: [
        { candidateId: 'c1', name: 'Sarah Kim', role: 'SAFE MLO', status: 'in_training', isSampleData: true, readinessScore: 91, readinessBasis: 'weighted-average-of-training-events', csaEvidenceCount: 0, scoreUnbacked: true },
        { candidateId: 'c2', name: 'John Smith', role: 'ServiceNow CSA', status: 'in_training', isSampleData: false, readinessScore: 74, readinessBasis: 'weighted-average-of-training-events', csaEvidenceCount: 2, scoreUnbacked: false },
        { candidateId: 'c3', name: 'Mary Jones', role: 'AHIP Medicare', status: 'approved', isSampleData: false, readinessScore: 0, readinessBasis: 'no-training-data', csaEvidenceCount: 0, scoreUnbacked: false },
      ],
    }),
  }));

  await page.goto('/html/workforce/certification-dashboard.html', { waitUntil: 'networkidle' });

  await expect(page.locator('tbody tr')).toHaveCount(3);
  await expect(page.locator('.badge.unbacked')).toHaveCount(1);
  await expect(page.locator('.badge.backed')).toHaveCount(1);
  await expect(page.locator('tbody tr').nth(0)).toContainText('Sarah Kim');
  await expect(page.locator('tbody tr').nth(0)).toContainText('unbacked');

  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toHaveLength(0);
});
