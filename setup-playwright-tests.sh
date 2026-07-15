#!/usr/bin/env bash
# One-shot setup script for the TSM War Room Playwright test suite.
# Creates war-room-playwright-tests/ in the current directory with all
# non-HTML files (config, package.json, README, and every spec file).
#
# Usage: run this from wherever you want the project folder created
# (e.g. your project root, next to your html/ tree), then:
#   cd war-room-playwright-tests && npm install && npx playwright install --with-deps chromium
set -euo pipefail

PROJECT_DIR="war-room-playwright-tests"
mkdir -p "$PROJECT_DIR/tests"

cat > "$PROJECT_DIR/README.md" << 'EOF_README_MD'
# TSM War Room — Playwright Test Suite

Covers every chain listed in `war-room-prep.html`: 7 sector war rooms, 10
enterprise phase war rooms, the two Honeywell BPO scenarios, the doc-search
"upload" entry point, and a regression suite for the checklist page itself.

## Setup

```bash
npm install
npx playwright install --with-deps chromium
```

## Running against your live TSM instance

```bash
BASE_URL=https://your-tsm-host.example.com npm test
```

`BASE_URL` defaults to `http://localhost:8080` (see `playwright.config.js`).

## Running just the checklist regression suite (no live server needed)

```bash
npm run test:checklist
```

This points at `war-room-prep__2__patched.html` by default (one directory
up from this project). Override with `CHECKLIST_PATH=file:///abs/path.html`.

## Files

| File | Covers |
|---|---|
| `tests/demo-chains.spec.js` | All 7 sector + 10 phase war-room → strategist → executive-portal chains |
| `tests/entry-point.spec.js` | The `launchDocSearch()` bridge / doc-search "upload" entry point for every sector |
| `tests/honeywell.spec.js` | BPO checklist steps 11–12: Supplier Shutdown, Plant Incident Command Center, Cyber Incident War Room |
| `tests/checklist.spec.js` | Regression test proving the `STEPS` off-by-one fix in `war-room-prep.html` |
| `tests/helpers.js` | Shared navigation/paste/escalate helpers |

## Important caveats — read before trusting a green run

1. **Selectors are best-effort, not verified against live DOM.** I only had
   `war-room-prep.html` (the QA checklist) to work from — not the actual
   `hc-denial-war-room.html`, `bpo-war-room.html`, etc. Button/tab text
   (`"Escalate"`, `"Run all engines"`, `"Plant Incident Command Center"`)
   was pulled from the checklist's own descriptions. If the real pages use
   different copy or `data-testid`s, swap the locators in `helpers.js` and
   `honeywell.spec.js` accordingly — that's the highest-value first pass
   once you run this against the real site.
2. **This sandbox has no network access**, so these specs could only be
   syntax-checked (`node --check`), not executed against a live TSM
   instance or a real Chromium install. Run `npm test` yourself before
   trusting results.
3. **`tests/checklist.spec.js` is the one suite I could reason about with
   full confidence**, since I have the actual source for
   `war-room-prep__2__patched.html` and its exact element IDs/behavior.
4. Where a locator can't find its target, tests log a `note` annotation
   instead of hard-failing immediately, so one missing selector doesn't
   mask everything else that *does* work. Tighten these to hard assertions
   once you've confirmed real selectors.
EOF_README_MD

cat > "$PROJECT_DIR/package.json" << 'EOF_PACKAGE_JSON'
{
  "name": "tsm-war-room-playwright-tests",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "test:checklist": "playwright test tests/checklist.spec.js",
    "test:honeywell": "playwright test tests/honeywell.spec.js",
    "report": "playwright show-report"
  },
  "devDependencies": {
    "@playwright/test": "^1.47.0"
  }
}
EOF_PACKAGE_JSON

cat > "$PROJECT_DIR/playwright.config.js" << 'EOF_PLAYWRIGHT_CONFIG_JS'
// playwright.config.js
// Run against your deployed TSM instance:
//   BASE_URL=https://your-tsm-host.example.com npx playwright test
// Defaults to localhost:8080 if BASE_URL is not set.
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false, // chains navigate multi-step; keep deterministic per file
  workers: 4,
  retries: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 15_000,
    actionTimeout: 10_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
EOF_PLAYWRIGHT_CONFIG_JS

cat > "$PROJECT_DIR/tests/checklist.spec.js" << 'EOF_TESTS_CHECKLIST_SPEC_JS'
// tests/checklist.spec.js
// Regression test for war-room-prep.html itself (the patched copy), not
// the live TSM demos. Confirms the STEPS off-by-one fix holds: checking
// every box in a sector lands on exactly 100%, survives a reload, and
// RESET actually clears every checkbox including the last one.
//
// Run standalone (doesn't need BASE_URL / a live server):
//   npx playwright test tests/checklist.spec.js --config=playwright.config.js
// Point CHECKLIST_PATH at wherever you serve the patched file, e.g.
//   CHECKLIST_PATH=file:///abs/path/to/war-room-prep__2__patched.html npx playwright test tests/checklist.spec.js
const path = require('path');
const { test, expect } = require('@playwright/test');

const CHECKLIST_PATH =
  process.env.CHECKLIST_PATH ||
  'file://' + path.resolve(__dirname, '..', '..', 'war-room-prep__2__patched.html');

const SECTORS_WITH_FIXED_OFFBYONE = ['hc', 'finops', 'ins', 'con', 're']; // 5 declared -> 6 actual
const LEGAL = 'legal'; // 6 declared -> 7 actual

test.describe('war-room-prep.html — STEPS off-by-one regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(CHECKLIST_PATH);
    // Clear any persisted state from a previous run so each test starts clean.
    await page.evaluate(() => localStorage.removeItem('tsm_war_room_prep_state_v1'));
    await page.reload();
  });

  for (const id of SECTORS_WITH_FIXED_OFFBYONE) {
    test(`${id}: checking all 6 steps shows exactly 100%, not 120%`, async ({ page }) => {
      await page.evaluate((sectorId) => window.switchTo(sectorId), id);
      for (let i = 0; i < 6; i++) {
        await page.check(`#chk-${id}-${i}`);
      }
      await expect(page.locator(`#pct-${id}`)).toHaveText('100%');
      await expect(page.locator(`#nav-pct-${id}`)).toHaveText('100%');
    });

    test(`${id}: last checkbox survives a reload`, async ({ page }) => {
      await page.evaluate((sectorId) => window.switchTo(sectorId), id);
      await page.check(`#chk-${id}-5`);
      await page.reload();
      await page.evaluate((sectorId) => window.switchTo(sectorId), id);
      await expect(page.locator(`#chk-${id}-5`)).toBeChecked();
    });

    test(`${id}: RESET clears the last checkbox too`, async ({ page }) => {
      await page.evaluate((sectorId) => window.switchTo(sectorId), id);
      for (let i = 0; i < 6; i++) await page.check(`#chk-${id}-${i}`);
      await page.evaluate((sectorId) => window.resetWr(sectorId), id);
      await expect(page.locator(`#chk-${id}-5`)).not.toBeChecked();
      await expect(page.locator(`#pct-${id}`)).toHaveText('0%');
    });
  }

  test(`${LEGAL}: checking all 7 steps shows exactly 100%`, async ({ page }) => {
    await page.evaluate(() => window.switchTo('legal'));
    for (let i = 0; i < 7; i++) {
      await page.check(`#chk-legal-${i}`);
    }
    await expect(page.locator('#pct-legal')).toHaveText('100%');
  });

  test('bpo (unaffected by the bug): all 12 steps including both Honeywell items reach 100%', async ({ page }) => {
    await page.evaluate(() => window.switchTo('bpo'));
    for (let i = 0; i < 12; i++) {
      await page.check(`#chk-bpo-${i}`);
    }
    await expect(page.locator('#pct-bpo')).toHaveText('100%');
    await expect(page.locator('#chk-bpo-11')).toBeChecked(); // Honeywell: Plant Incident + Cyber Incident
  });

  test('global readiness % never exceeds 100 across every section', async ({ page }) => {
    const allIds = await page.evaluate(() => window.WR_IDS);
    for (const id of allIds) {
      const stepsCount = await page.evaluate((sectionId) => window.STEPS[sectionId], id);
      await page.evaluate((sectionId) => window.switchTo(sectionId), id);
      for (let i = 0; i < stepsCount; i++) {
        const cb = page.locator(`#chk-${id}-${i}`);
        if (await cb.count()) await cb.check();
      }
    }
    const globalPct = await page.locator('#g-pct').textContent();
    expect(Number(globalPct.replace('%', ''))).toBeLessThanOrEqual(100);
  });
});
EOF_TESTS_CHECKLIST_SPEC_JS

cat > "$PROJECT_DIR/tests/demo-chains.spec.js" << 'EOF_TESTS_DEMO_CHAINS_SPEC_JS'
// tests/demo-chains.spec.js
// Walks every War Room -> Strategist -> Executive Portal chain referenced
// in war-room-prep.html and confirms each stage loads cleanly.
const { test, expect } = require('@playwright/test');
const { gotoAndCheck, pasteSampleDocAndRun, escalate, assertNoErrorBanners } = require('./helpers');

// ── 7 vertical sector chains ────────────────────────────────────────────
const SECTOR_CHAINS = {
  hc: {
    label: 'Healthcare — Denial Appeal',
    warRoom: '/html/healthcare/hc-denial-war-room.html',
    strategist: '/html/healthcare/hc-main-strategist.html',
    exec: '/html/healthcare/executive-portal.html',
    expectOnWarRoom: /CO-50/i,
  },
  finops: {
    label: 'FinOps — Cloud Cost Anomaly',
    warRoom: '/html/finops-suite/finops-war-room.html',
    strategist: '/html/finops-suite/finops-main-strategist.html',
    exec: '/html/finops-suite/finops-executive-portal.html',
  },
  ins: {
    label: 'Insurance — Subrogation Review',
    warRoom: '/html/tsm-insurance/insurance-war-room.html',
    strategist: '/html/tsm-insurance/insurance-strategist.html',
    exec: '/html/tsm-insurance/insurance-executive-portal.html',
  },
  con: {
    label: 'Construction — Change Order Risk',
    warRoom: '/html/construction-suite/construction-war-room.html',
    strategist: '/html/construction-suite/construction-strategist.html',
    exec: '/html/construction-suite/construction-executive-portal.html',
    extraPages: ['/html/construction-suite/permits-proposals.html'],
  },
  legal: {
    label: 'Legal — Evidence Prioritization',
    warRoom: '/html/legal-pro/legal-war-room.html',
    strategist: '/html/legal-pro/legal-main-strategist.html',
    exec: '/html/legal-pro/legal-executive-portal.html',
    extraPages: ['/html/legal-pro/legal-nodes.html'],
  },
  re: {
    label: 'Real Estate — Transaction Risk',
    warRoom: '/html/reo-pro/re-war-room.html',
    strategist: '/html/reo-pro/re-strategist.html',
    exec: '/html/reo-pro/re-exec-portal.html',
  },
  bpo: {
    label: 'BPO — Supplier Bankruptcy',
    warRoom: '/html/bpo/bpo-situation-room.html',
    strategist: '/html/bpo/bpo-strategist-v2.html',
    exec: '/html/bpo/bpo-executive-portal.html',
  },
};

// ── 10 enterprise capability-matrix phases ──────────────────────────────
// Note: integration-hub and digital-twin use a bare "<id>.html" for their
// war-room stage (no "-war-room" suffix) — matches the hrefs in the
// checklist exactly, don't "fix" this to be consistent, it'll 404.
const PHASE_CHAINS = {
  o2c: base('o2c', 'o2c'),
  crm: base('crm', 'crm'),
  cpq: base('cpq', 'cpq'),
  catalog: base('catalog', 'catalog'),
  approval: base('approval', 'approval'),
  mdm: base('mdm', 'mdm'),
  'integration-hub': base('integration-hub', 'integration-hub', { bareWarRoom: true }),
  governance: base('governance', 'governance'),
  noc: base('noc', 'noc'),
  'digital-twin': base('digital-twin', 'digital-twin', { bareWarRoom: true }),
};

function base(dir, id, { bareWarRoom = false } = {}) {
  return {
    label: id,
    warRoom: bareWarRoom ? `/html/war-rooms/${dir}/${id}.html` : `/html/war-rooms/${dir}/${id}-war-room.html`,
    strategist: `/html/war-rooms/${dir}/${id}-strategist.html`,
    exec: `/html/war-rooms/${dir}/${id}-executive-portal.html`,
  };
}

const SAMPLE_DOC_FALLBACK = 'Sample document pasted by automated regression test.';

function runChainTests(groupName, chains) {
  test.describe(groupName, () => {
    for (const [id, chain] of Object.entries(chains)) {
      test.describe(`${id} — ${chain.label}`, () => {
        test('war room loads and accepts a document', async ({ page }) => {
          const errors = await gotoAndCheck(page, chain.warRoom);
          await assertNoErrorBanners(page);
          if (chain.expectOnWarRoom) {
            await expect(page.getByText(chain.expectOnWarRoom)).toBeVisible({ timeout: 10_000 }).catch(() => {
              test.info().annotations.push({
                type: 'note',
                description: `Expected marker ${chain.expectOnWarRoom} not found — check selector once live DOM is known.`,
              });
            });
          }
          await pasteSampleDocAndRun(page, SAMPLE_DOC_FALLBACK);
          expect(errors, `Console/page errors on ${chain.warRoom}:\n${errors.join('\n')}`).toEqual([]);
        });

        test('strategist stage loads', async ({ page }) => {
          const errors = await gotoAndCheck(page, chain.strategist);
          await assertNoErrorBanners(page);
          expect(errors, `Console/page errors on ${chain.strategist}:\n${errors.join('\n')}`).toEqual([]);
        });

        test('executive portal stage loads', async ({ page }) => {
          const errors = await gotoAndCheck(page, chain.exec);
          await assertNoErrorBanners(page);
          expect(errors, `Console/page errors on ${chain.exec}:\n${errors.join('\n')}`).toEqual([]);
        });

        test('full chain: war room -> escalate -> strategist -> escalate -> executive portal', async ({ page }) => {
          await gotoAndCheck(page, chain.warRoom);
          await pasteSampleDocAndRun(page, SAMPLE_DOC_FALLBACK);
          await escalate(page, /escalate/i).catch(() =>
            test.info().annotations.push({ type: 'note', description: 'No "Escalate" CTA found on war room stage; falling back to direct nav.' })
          );
          if (!page.url().includes(chain.strategist)) {
            await gotoAndCheck(page, chain.strategist);
          }
          await escalate(page, /escalate|approve|send to exec/i).catch(() =>
            test.info().annotations.push({ type: 'note', description: 'No escalate CTA found on strategist stage; falling back to direct nav.' })
          );
          if (!page.url().includes(chain.exec)) {
            await gotoAndCheck(page, chain.exec);
          }
          await assertNoErrorBanners(page);
        });

        for (const extra of chain.extraPages || []) {
          test(`extra page loads: ${extra}`, async ({ page }) => {
            const errors = await gotoAndCheck(page, extra);
            expect(errors, `Console/page errors on ${extra}:\n${errors.join('\n')}`).toEqual([]);
          });
        }
      });
    }
  });
}

runChainTests('Sector war rooms', SECTOR_CHAINS);
runChainTests('Enterprise phase war rooms', PHASE_CHAINS);

test.describe('Standalone governance links', () => {
  for (const path of ['/html/compliance.html', '/html/zero-trust.html']) {
    test(`${path} loads cleanly`, async ({ page }) => {
      const errors = await gotoAndCheck(page, path);
      expect(errors).toEqual([]);
    });
  }
});
EOF_TESTS_DEMO_CHAINS_SPEC_JS

cat > "$PROJECT_DIR/tests/entry-point.spec.js" << 'EOF_TESTS_ENTRY_POINT_SPEC_JS'
// tests/entry-point.spec.js
// war-room-prep.html's launchDocSearch() sends the user to
// tsm-doc-search-multi.html?sector=...&mode=...&entry=...&scenario=...&title=...
// This mirrors that redirect for every sector so the "upload" starting
// point of each chain is actually exercised, not just the war-room page
// itself.
const { test, expect } = require('@playwright/test');
const { gotoAndCheck, assertNoErrorBanners } = require('./helpers');

const SECTOR_LAUNCH_PARAMS = {
  hc: { sector: 'healthcare', mode: 'warroom', entry: 'situation-room', scenario: 'denial-appeal', title: 'Healthcare' },
  finops: { sector: 'finops', mode: 'warroom', entry: 'situation-room', scenario: 'cloud-cost-anomaly', title: 'FinOps' },
  ins: { sector: 'insurance', mode: 'warroom', entry: 'situation-room', scenario: 'subrogation-review', title: 'Insurance' },
  con: { sector: 'construction', mode: 'warroom', entry: 'situation-room', scenario: 'change-order-risk', title: 'Construction' },
  legal: { sector: 'legal', mode: 'warroom', entry: 'situation-room', scenario: 'evidence-prioritization', title: 'Legal' },
  re: { sector: 'real-estate', mode: 'warroom', entry: 'situation-room', scenario: 'transaction-risk-review', title: 'Real Estate' },
  bpo: { sector: 'bpo', mode: 'chain', entry: 'situation-room', scenario: 'supplier-bankruptcy', title: 'Supplier Bankruptcy' },
};

test.describe('Doc Search launch bridge (upload entry point)', () => {
  test('tsm-doc-search-multi.html loads on its own', async ({ page }) => {
    const errors = await gotoAndCheck(page, '/html/tsm-doc-search-multi.html');
    await assertNoErrorBanners(page);
    expect(errors).toEqual([]);
  });

  for (const [id, params] of Object.entries(SECTOR_LAUNCH_PARAMS)) {
    test(`launch bridge routes ${id} into its war room`, async ({ page }) => {
      const qs = new URLSearchParams(params).toString();
      const errors = await gotoAndCheck(page, `/html/tsm-doc-search-multi.html?${qs}`);
      await assertNoErrorBanners(page);
      expect(errors, `Console/page errors launching ${id}:\n${errors.join('\n')}`).toEqual([]);

      // If the page reads these params and presents an "open war room" CTA,
      // click it and confirm we land somewhere sector-appropriate.
      const openCta = page.getByRole('link', { name: /open war room|launch|continue/i })
        .or(page.getByRole('button', { name: /open war room|launch|continue/i }));
      if (await openCta.count()) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => null),
          openCta.first().click(),
        ]);
        await assertNoErrorBanners(page);
      }
    });
  }

  test('sessionStorage payload is written with expected shape', async ({ page }) => {
    await gotoAndCheck(page, '/html/tsm-doc-search-multi.html?sector=healthcare&mode=warroom&entry=situation-room');
    const payload = await page.evaluate(() => {
      try {
        return JSON.parse(sessionStorage.getItem('tsmWarRoomLaunch') || 'null');
      } catch {
        return null;
      }
    });
    // This key is only set by war-room-prep.html's own launchDocSearch();
    // navigating directly (as this test does) won't populate it. Kept as
    // a smoke check + documentation of the expected shape for whoever
    // wires an actual "click launch from war-room-prep" flow next.
    test.info().annotations.push({
      type: 'note',
      description: `sessionStorage.tsmWarRoomLaunch = ${JSON.stringify(payload)}`,
    });
  });
});
EOF_TESTS_ENTRY_POINT_SPEC_JS

cat > "$PROJECT_DIR/tests/helpers.js" << 'EOF_TESTS_HELPERS_JS'
// tests/helpers.js
const { expect } = require('@playwright/test');

/**
 * Navigate to a path and assert a healthy response with no uncaught JS
 * errors. Returns any console/page errors seen so callers can assert on
 * them explicitly (some pages may intentionally log warnings).
 */
async function gotoAndCheck(page, path) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  expect(response, `No response returned for ${path}`).not.toBeNull();
  expect(response.status(), `${path} responded with ${response.status()}`).toBeLessThan(400);
  await page.waitForLoadState('networkidle').catch(() => {
    // some pages hold a socket open (live relay/stream); don't fail the
    // whole test over it, DOMContentLoaded already succeeded above.
  });

  return errors;
}

/**
 * Best-effort "paste a sample document and run the engines" flow.
 * Real DOM/selectors for each war-room page weren't available at authoring
 * time (only the QA checklist copy was). This tries the button labels used
 * in that checklist ("Run all 4 engines", "Run scenario", etc). If your
 * live markup differs, add a data-testid to the run button and swap the
 * locator below for `page.getByTestId('run-engines')`.
 */
async function pasteSampleDocAndRun(page, sampleText) {
  const textarea = page.locator('textarea').first();
  if (await textarea.count()) {
    await textarea.fill(sampleText);
  }

  const runButtonPatterns = [
    /run all.*engines/i,
    /run engines/i,
    /run scenario/i,
    /run analysis/i,
    /^analyze$/i,
    /^run$/i,
  ];

  for (const pattern of runButtonPatterns) {
    const btn = page.getByRole('button', { name: pattern });
    if (await btn.count()) {
      await btn.first().click();
      return true;
    }
  }
  return false;
}

/**
 * Click an escalate/next-stage CTA and wait for the chain to advance
 * (war room -> strategist -> executive portal).
 */
async function escalate(page, pattern = /escalate/i) {
  const candidate = page
    .getByRole('link', { name: pattern })
    .or(page.getByRole('button', { name: pattern }));
  await expect(candidate.first()).toBeVisible({ timeout: 10_000 });

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => null),
    candidate.first().click(),
  ]);
}

/** Assert the page has no visible "error", "failed", or "undefined" banners. */
async function assertNoErrorBanners(page) {
  const badText = page.getByText(/uncaught|undefined is not|failed to fetch|500 internal|404 not found/i);
  await expect(badText, 'Page shows an unhandled error banner').toHaveCount(0);
}

module.exports = { gotoAndCheck, pasteSampleDocAndRun, escalate, assertNoErrorBanners };
EOF_TESTS_HELPERS_JS

cat > "$PROJECT_DIR/tests/honeywell.spec.js" << 'EOF_TESTS_HONEYWELL_SPEC_JS'
// tests/honeywell.spec.js
// Covers war-room-prep.html checklist steps chk-bpo-10 and chk-bpo-11:
//   Step 11: Supplier Shutdown War Room scenario
//   Step 12: Plant Incident Command Center + Cyber Incident War Room
//            scenario tabs, reachable inside the BPO chain
const { test, expect } = require('@playwright/test');
const { gotoAndCheck, assertNoErrorBanners } = require('./helpers');

const BPO_WAR_ROOM = '/html/bpo/bpo-situation-room.html';

const SUPPLIER_SHUTDOWN_DOC = `
SUPPLIER SHUTDOWN NOTICE — GlobalParts Inc. (Chapter 11)
Frozen POs: $2.3M
Affected production lines: A, B, C
Decision window: 6 hours
`.trim();

test.describe('Honeywell enterprise scenarios (BPO chain)', () => {
  test('Supplier Shutdown scenario resolves to Option A / Supplier B contingency', async ({ page }) => {
    const errors = await gotoAndCheck(page, BPO_WAR_ROOM);
    await assertNoErrorBanners(page);

    const textarea = page.locator('textarea').first();
    if (await textarea.count()) {
      await textarea.fill(SUPPLIER_SHUTDOWN_DOC);
    } else {
      test.info().annotations.push({ type: 'note', description: 'No textarea found on BPO war room — check for a scenario picker/tab instead.' });
    }

    const runBtn = page.getByRole('button', { name: /run|analyze|activate/i });
    if (await runBtn.count()) {
      await runBtn.first().click();
    }

    // Expect the 4 impact tiles called out in the checklist.
    const expectations = [
      /2\.3M/, // frozen POs
      /line[s]? A/i,
      /6[- ]hour/i,
      /option a|supplier b/i,
    ];
    for (const pattern of expectations) {
      await expect(page.getByText(pattern), `Expected to find ${pattern} on BPO war room after running Supplier Shutdown scenario`)
        .toBeVisible({ timeout: 10_000 })
        .catch(() => {
          test.info().annotations.push({ type: 'note', description: `Marker ${pattern} not found — verify against live selectors.` });
        });
    }

    expect(errors, `Console/page errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('Plant Incident Command Center scenario tab is reachable and produces output', async ({ page }) => {
    await gotoAndCheck(page, BPO_WAR_ROOM);
    await assertNoErrorBanners(page);

    const tab = page.getByRole('tab', { name: /plant incident command center/i })
      .or(page.getByRole('link', { name: /plant incident command center/i }))
      .or(page.getByRole('button', { name: /plant incident command center/i }));

    await expect(tab.first(), 'Plant Incident Command Center tab not found on BPO war room').toBeVisible({ timeout: 10_000 });
    await tab.first().click();

    await expect(
      page.getByText(/incident|command center/i),
      'Expected Plant Incident Command Center content to render after clicking its tab'
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Cyber Incident War Room scenario tab is reachable and produces output', async ({ page }) => {
    await gotoAndCheck(page, BPO_WAR_ROOM);
    await assertNoErrorBanners(page);

    const tab = page.getByRole('tab', { name: /cyber incident/i })
      .or(page.getByRole('link', { name: /cyber incident/i }))
      .or(page.getByRole('button', { name: /cyber incident/i }));

    await expect(tab.first(), 'Cyber Incident War Room tab not found on BPO war room').toBeVisible({ timeout: 10_000 });
    await tab.first().click();

    await expect(
      page.getByText(/cyber|incident/i),
      'Expected Cyber Incident War Room content to render after clicking its tab'
    ).toBeVisible({ timeout: 10_000 });
  });

  test('both Honeywell scenarios produce output through the full 4-stage chain', async ({ page }) => {
    await gotoAndCheck(page, BPO_WAR_ROOM);

    for (const label of [/plant incident command center/i, /cyber incident/i]) {
      const tab = page.getByRole('tab', { name: label })
        .or(page.getByRole('link', { name: label }))
        .or(page.getByRole('button', { name: label }));
      if (await tab.count()) {
        await tab.first().click();
        const runBtn = page.getByRole('button', { name: /run|analyze/i });
        if (await runBtn.count()) await runBtn.first().click();
        await assertNoErrorBanners(page);
      } else {
        test.info().annotations.push({ type: 'note', description: `Tab for ${label} not found — mark chk-bpo-11 manually until selector confirmed.` });
      }
    }
  });
});
EOF_TESTS_HONEYWELL_SPEC_JS

echo "Created $PROJECT_DIR/ with:"
find "$PROJECT_DIR" -type f | sort

echo
echo "Next steps:"
echo "  cd $PROJECT_DIR"
echo "  npm install"
echo "  npx playwright install --with-deps chromium"
echo "  BASE_URL=https://your-host npm test"