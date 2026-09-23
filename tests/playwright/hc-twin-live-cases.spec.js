// tests/playwright/hc-twin-live-cases.spec.js
//
// Hospital Operations Twin (html/healthcare/executive-portal.html): the "Live cases"
// strip posts the relayed War Room case to POST /api/hc/portfolio-intelligence and
// reports what is live, while the sliders keep running on the demo baseline.
//
// The endpoint is mocked with page.route so this spec needs no login session; it
// verifies the page's behavior for success, empty, 401 and network-failure responses,
// and that an absent exposure is never sent as $0.
//
// Run: npx playwright test tests/playwright/hc-twin-live-cases.spec.js

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PAGE = `${BASE_URL}/html/healthcare/executive-portal.html`;
const API = '**/api/hc/portfolio-intelligence';

function twinResponse(overrides = {}) {
  return {
    ok: true,
    engine: 'hc-portfolio-intelligence-v1',
    twin: {
      counts: { claims: 0, denials: 0, appeals: 0, agedAccounts: 0, findings: 0 },
      leakageSummary: { opportunityCount: 0, exposureKnownCount: 0, exposureUnknownCount: 0, totalExplicitExposure: 0 },
      ...overrides,
    },
  };
}

test.describe('HC Digital Twin live-cases strip', () => {
  test('live cases included: tag and strip report opportunities and known exposure', async ({ page }) => {
    await page.route(API, (route) => route.fulfill({
      json: twinResponse({
        counts: { claims: 0, denials: 1, appeals: 0, agedAccounts: 0, findings: 2 },
        leakageSummary: { opportunityCount: 1, exposureKnownCount: 1, exposureUnknownCount: 0, totalExplicitExposure: 12500 },
      }),
    }));
    await page.goto(PAGE);
    await expect(page.locator('#twin-tag')).toHaveText('PLANNING ESTIMATE · LIVE CASES INCLUDED');
    await expect(page.locator('#twin-live-msg')).toContainText('1 recovery opportunity');
    await expect(page.locator('#twin-live-msg')).toContainText('$12,500 known exposure');
    await expect(page.locator('#twin-live-msg')).toContainText('2 node findings');
  });

  test('live denial with no exposure figure: says exposure is not yet known, never $0', async ({ page }) => {
    await page.route(API, (route) => route.fulfill({
      json: twinResponse({
        counts: { claims: 0, denials: 1, appeals: 0, agedAccounts: 0, findings: 0 },
        leakageSummary: { opportunityCount: 1, exposureKnownCount: 0, exposureUnknownCount: 1, totalExplicitExposure: 0 },
      }),
    }));
    await page.goto(PAGE);
    await expect(page.locator('#twin-tag')).toHaveText('PLANNING ESTIMATE · LIVE CASES INCLUDED');
    await expect(page.locator('#twin-live-msg')).toContainText('exposure not yet known for 1');
    await expect(page.locator('#twin-live-msg')).not.toContainText('$0');
  });

  test('no live cases: stays on the demo baseline with a prompt', async ({ page }) => {
    await page.route(API, (route) => route.fulfill({ json: twinResponse() }));
    await page.goto(PAGE);
    await expect(page.locator('#twin-tag')).toHaveText('PLANNING ESTIMATE · DEMO BASELINE');
    await expect(page.locator('#twin-live-msg')).toContainText('No live cases yet');
  });

  test('401: demo baseline with a sign-in message', async ({ page }) => {
    await page.route(API, (route) => route.fulfill({ status: 401, json: { ok: false, error: 'Unauthorized' } }));
    await page.goto(PAGE);
    await expect(page.locator('#twin-tag')).toHaveText('PLANNING ESTIMATE · DEMO BASELINE');
    await expect(page.locator('#twin-live-msg')).toContainText('sign in');
  });

  test('network failure: falls back quietly', async ({ page }) => {
    await page.route(API, (route) => route.abort());
    await page.goto(PAGE);
    await expect(page.locator('#twin-live-msg')).toContainText('unavailable');
    await expect(page.locator('#twin-tag')).toHaveText('PLANNING ESTIMATE · DEMO BASELINE');
  });

  test('relayed case is sent, and an absent exposure is not sent as $0', async ({ page }) => {
    let body = null;
    await page.route(API, (route) => {
      body = route.request().postDataJSON();
      route.fulfill({ json: twinResponse() });
    });
    await page.addInitScript(() => {
      sessionStorage.setItem('TSM_HEALTHCARE_RELAY', JSON.stringify({
        structuredCase: { claimId: 'CLM-88201', payer: 'Horizon Mutual', denialReasonCode: 'CO-197', financialExposure: null },
      }));
    });
    await page.goto(PAGE);
    await expect(page.locator('#twin-live-msg')).not.toHaveText(/Checking/);
    const denial = body && body.sections && body.sections.denials && body.sections.denials[0];
    expect(denial).toBeTruthy();
    expect(denial.claimId).toBe('CLM-88201');
    expect(denial.payer).toBe('Horizon Mutual');
    expect(Object.prototype.hasOwnProperty.call(denial, 'financialExposure')).toBe(false);
  });

  test('sliders still compute on the demo baseline regardless of live data', async ({ page }) => {
    await page.route(API, (route) => route.fulfill({ json: twinResponse() }));
    await page.goto(PAGE);
    // defaults: 10% prevented, +5 pts win rate, 48d DSO
    await expect(page.locator('#twin-o-prevented')).toHaveText('$18,700');
    await expect(page.locator('#twin-o-net')).toHaveText('+$14,399');
    await expect(page.locator('#twin-o-cash')).toHaveText('$52,846');
  });
});
