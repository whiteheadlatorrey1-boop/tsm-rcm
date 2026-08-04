#!/usr/bin/env bash
# Run this from the repo root (tsm-rcm/) on branch fix/hotelops-demo-timing-and-readability
set -e

cat > demo/demo-engine.js << 'TSMPATCHEOF'
/**
 * demo-engine.js
 * Generic, vertical-agnostic Playwright capture engine.
 * Drives a page through a scripted "story" and saves one numbered
 * screenshot per step. Feed it a different *-demo.json per vertical
 * (healthcare-demo.json, hotel-demo.json, construction-demo.json, ...)
 * and the same spec file works for all of them.
 *
 * Step shape (all fields optional except `shot`):
 * {
 *   "shot":   "004-classification-results",   // required, becomes 004-classification-results.png
 *   "goto":   "/html/healthcare/hc-node.html", // navigate first (relative to baseURL)
 *   "click":  "#run-classification",           // CSS selector to click before capture
 *   "fill":   { "#search": "denial 4471" },     // selector -> value map, filled before capture
 *   "waitFor": "#mission-queue .mission-row",   // selector to wait for before capture
 *   "waitMs": 1200,                             // flat delay before capture (animations, counters)
 *   "fullPage": true                            // default true; set false for viewport-only shot
 * }
 *
 * Story-level (top of the *-demo.json, alongside "steps"):
 * {
 *   "presetLocalStorage": { "finops_war_tour_done": "1" }
 *   // Injected via page.addInitScript before any navigation, so it's present
 *   // before the page's own scripts run on first load. Use this to skip
 *   // auto-launching guided-tour overlays (or any other first-visit-gated
 *   // UI) that would otherwise intercept pointer events and block clicks
 *   // in a fresh, no-history Playwright context.
 * }
 */

const fs = require('fs');
const path = require('path');

async function runStory(page, { steps, outDir, baseURL = '', presetLocalStorage = null }) {
  fs.mkdirSync(outDir, { recursive: true });

  if (presetLocalStorage && Object.keys(presetLocalStorage).length) {
    await page.addInitScript((entries) => {
      for (const [key, value] of Object.entries(entries)) {
        try { window.localStorage.setItem(key, value); } catch (e) { /* ignore */ }
      }
    }, presetLocalStorage);
    console.log(`[demo-engine] presetLocalStorage applied: ${JSON.stringify(presetLocalStorage)}`);
  }

  for (const step of steps) {
    if (step.goto) {
      const url = step.goto.startsWith('http') ? step.goto : `${baseURL}${step.goto}`;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      console.log(`[demo-engine] step "${step.shot}" goto -> ${page.url()}`);
    }

    if (step.fill) {
      for (const [selector, value] of Object.entries(step.fill)) {
        await page.fill(selector, value);
      }
    }

    if (step.click) {
      console.log(`[demo-engine] step "${step.shot}" clicking "${step.click}" on ${page.url()}`);
      await page.click(step.click, { timeout: 15000 });
      console.log(`[demo-engine] step "${step.shot}" click landed, page now ${page.url()}`);
    }

    if (step.waitFor) {
      await page.waitForSelector(step.waitFor, { timeout: 15000 }).catch(() => {
        console.warn(`[demo-engine] waitFor "${step.waitFor}" timed out on step "${step.shot}" (page: ${page.url()}) — capturing anyway`);
      });
    }

    if (step.waitForFunction) {
      await page.waitForFunction(step.waitForFunction, { timeout: 15000 }).catch(() => {
        console.warn(`[demo-engine] waitForFunction "${step.waitForFunction}" timed out on step "${step.shot}" (page: ${page.url()}) — capturing anyway`);
      });
    }

    if (step.waitMs) {
      await page.waitForTimeout(step.waitMs);
    }

    const file = path.join(outDir, `${step.shot}.png`);
    await page.screenshot({ path: file, fullPage: step.fullPage === true });
    console.log(`[demo-engine] captured ${file}`);
  }
}

function loadStory(jsonPath) {
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data.steps)) {
    throw new Error(`${jsonPath}: expected top-level "steps" array`);
  }
  return data;
}

module.exports = { runStory, loadStory };
TSMPATCHEOF

cat > demo/finops-demo.json << 'TSMPATCHEOF'
{
  "vertical": "finops",
  "note": "Source-verified 2026-08-02 against whiteheadlatorrey1-boop/tsm-rcm (html/finops-suite/finops-war/finops-war-room.html + finops-main-strategist.html + finops-executive-portal.html) by reading real ids/onclick handlers/functions directly — NOT live-verified via Playwright (sandbox has no path to download Chromium, same 403 as the Codespace). Run this once in Codespaces and correct any selector drift before treating it as final, same as the healthcare spec's original pass.",
  "presetLocalStorage": { "finops_war_tour_done": "1" },
  "steps": [
    { "shot": "001-war-room-load", "goto": "/html/finops-suite/finops-war/finops-war-room.html", "waitMs": 1500 },

    { "shot": "002-load-sample-doc", "click": ".sample-chip[onclick=\"loadSample('ap')\"]", "waitFor": "#fo-upload-name", "waitMs": 800 },

    { "shot": "003-fire-engines", "click": "#fireBtn", "waitFor": "#kpiEngines", "waitMs": 5000 },

    { "shot": "004-engines-complete", "waitFor": "#escalateBar", "waitMs": 800 },

    { "shot": "005-escalate-to-strategist", "click": "button[onclick=\"escalateToStrategist()\"]", "waitMs": 2000 },

    { "shot": "006-strategist-load", "waitFor": "#genBtn", "waitMs": 800 },

    { "shot": "007-run-strategist", "click": "#genBtn", "waitFor": "#stratOutput", "waitMs": 4000 },

    { "shot": "008-relay-banner", "waitFor": "#relayBanner", "waitMs": 600 },

    { "shot": "009-push-to-exec", "click": "#execRelayBtn", "waitMs": 2000 },

    { "shot": "010-exec-portal-kpis", "waitFor": "#kpiExposure", "waitMs": 800 },

    { "shot": "011-exec-relay-content", "waitFor": "#relayContent", "waitMs": 500 }
  ]
}
TSMPATCHEOF

cat > demo/insurance-demo.json << 'TSMPATCHEOF'
{
  "vertical": "insurance",
  "note": "Source-verified 2026-08-02 against whiteheadlatorrey1-boop/tsm-rcm (html/war-rooms/insure-war/insurance-war-room.html + insurance-strategist.html + insurance-executive-portal.html) by reading real ids/onclick handlers/functions directly -- NOT live-verified via Playwright (this sandbox hits the same chrome-headless-shell 403 as the Codespace). NOTE: insurance-war-room.html's loadSample() function and its SAMPLES object (claims/dme/policy) existed with no actual button ever calling it -- dead code, same pattern as other orphaned-feature findings this project. Wired up 3 real sample-chip buttons (#smp-claims/#smp-dme/#smp-policy) in this same pass so this spec has something real to click, matching the FinOps/Construction demo-sample pattern. fireEngines() reads directly from #docPaste, so the sample-chip click must land there before firing. Run once in Codespaces and correct any selector drift before treating as final.",
  "presetLocalStorage": { "ins_war_tour_done": "1" },
  "steps": [
    { "shot": "001-war-room-load", "goto": "/html/war-rooms/insure-war/insurance-war-room.html", "waitMs": 1500 },

    { "shot": "002-load-sample-claims", "click": "#smp-claims", "waitFor": "#sbDoc", "waitMs": 800 },

    { "shot": "003-fire-engines", "click": "#fireBtn", "waitFor": "#kpiEngines", "waitMs": 5000 },

    { "shot": "004-engines-complete", "waitFor": "#escalateBar", "waitMs": 800 },

    { "shot": "005-escalate-to-strategist", "click": "button[onclick=\"escalateToStrategist()\"]", "waitMs": 2000 },

    { "shot": "006-strategist-load", "waitFor": "#runBtn", "waitMs": 800 },

    { "shot": "007-run-strategist-chain", "click": "#runBtn", "waitFor": "#insXPReasoning", "waitMs": 4500 },

    { "shot": "008-escalate-to-exec", "click": "button[onclick=\"escalateToExec()\"]", "waitMs": 2000 },

    { "shot": "009-exec-portal-kpis", "waitFor": "#kpiExposure", "waitMs": 800 },

    { "shot": "010-exec-explainability", "waitFor": ".tsmk-explain", "waitMs": 600 }
  ]
}
TSMPATCHEOF

cat > demo/realestate-demo.json << 'TSMPATCHEOF'
{
  "vertical": "realestate",
  "note": "Source-verified 2026-08-02 against whiteheadlatorrey1-boop/tsm-rcm (html/war-rooms/re-war/re-war-room.html + re-strategist.html + re-exec-portal.html) by reading real ids/onclick handlers/functions directly -- NOT live-verified via Playwright (this sandbox hits the same chrome-headless-shell 403 as the Codespace). escalateToStrategist() in re-war-room.html hard-blocks with an alert() if no analysis has run yet, so a quick-fire engine click and its output must come first. Run once in Codespaces and correct any selector drift before treating as final.",
  "presetLocalStorage": { "TSM_RE_TOUR_SEEN": "1" },
  "steps": [
    { "shot": "001-war-room-load", "goto": "/html/war-rooms/re-war/re-war-room.html", "waitMs": 1500 },

    { "shot": "002-quick-fire-compliance", "click": "div.quick-link[onclick*=\"quickFire('Run a compliance sweep\"]", "waitFor": "#feedBody", "waitMs": 3500 },

    { "shot": "003-feed-output", "waitFor": "#feedMeta", "waitMs": 500 },

    { "shot": "004-escalate-to-strategist", "click": "button.tb-btn.escalate[onclick=\"escalateToStrategist()\"]", "waitMs": 2000 },

    { "shot": "005-strategist-load", "waitFor": "#panel-brief", "waitMs": 800 },

    { "shot": "006-run-full-brief", "click": "button[onclick=\"runFullBrief()\"]", "waitFor": "#briefBody", "waitMs": 4000 },

    { "shot": "007-brief-metrics", "waitFor": "#brief-pipeline", "waitMs": 600 },

    { "shot": "008-escalate-to-exec", "click": "button.tb-btn.escalate[onclick=\"escalateToExec()\"]", "waitMs": 2000 },

    { "shot": "009-exec-portal-kpis", "waitFor": "#kpi-pipeline", "waitMs": 800 },

    { "shot": "010-exec-explainability", "waitFor": ".tsmk-explain", "waitMs": 600 }
  ]
}
TSMPATCHEOF

cat > tests/e2e/demo/bpo-demo.spec.js << 'TSMPATCHEOF'
const { test } = require('@playwright/test');
const path = require('path');
const { runStory, loadStory } = require('../../../demo/demo-engine');

// Point this at your running TSM server (Codespace forwarded port or localhost).
const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:8080';

test('BPO executive demo', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  test.setTimeout(120_000);

  const story = loadStory(path.join(__dirname, '../../../demo/bpo-demo.json'));
  const outDir = path.join(__dirname, 'screenshots', 'bpo');

  await runStory(page, {
    steps: story.steps,
    outDir,
    presetLocalStorage: story.presetLocalStorage,
    baseURL: BASE_URL,
  });
});
TSMPATCHEOF

cat > tests/e2e/demo/construction-demo.spec.js << 'TSMPATCHEOF'
const { test } = require('@playwright/test');
const path = require('path');
const { runStory, loadStory } = require('../../../demo/demo-engine');

// Point this at your running TSM server (Codespace forwarded port or localhost).
const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:8080';

test('Construction executive demo', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  test.setTimeout(120_000);

  const story = loadStory(path.join(__dirname, '../../../demo/construction-demo.json'));
  const outDir = path.join(__dirname, 'screenshots', 'construction');

  await runStory(page, {
    steps: story.steps,
    outDir,
    presetLocalStorage: story.presetLocalStorage,
    baseURL: BASE_URL,
  });
});
TSMPATCHEOF

cat > tests/e2e/demo/cyber-incident-demo.spec.js << 'TSMPATCHEOF'
const { test } = require('@playwright/test');
const path = require('path');
const { runStory, loadStory } = require('../../../demo/demo-engine');
const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:8080';
test('Cyber Incident executive demo', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const story = loadStory(path.join(__dirname, '../../../demo/cyber-incident-demo.json'));
  const outDir = path.join(__dirname, 'screenshots', 'cyber-incident');
  await runStory(page, {
    steps: story.steps,
    outDir,
    presetLocalStorage: story.presetLocalStorage,
    baseURL: BASE_URL,
  });
});
TSMPATCHEOF

cat > tests/e2e/demo/finops-demo.spec.js << 'TSMPATCHEOF'
const { test } = require('@playwright/test');
const path = require('path');
const { runStory, loadStory } = require('../../../demo/demo-engine');

// Point this at your running TSM server (Codespace forwarded port or localhost).
const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:8080';

test('FinOps executive demo', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  test.setTimeout(120_000);

  const story = loadStory(path.join(__dirname, '../../../demo/finops-demo.json'));
  const outDir = path.join(__dirname, 'screenshots', 'finops');

  await runStory(page, {
    steps: story.steps,
    outDir,
    presetLocalStorage: story.presetLocalStorage,
    baseURL: BASE_URL,
  });
});
TSMPATCHEOF

cat > tests/e2e/demo/healthcare-demo.spec.js << 'TSMPATCHEOF'
const { test } = require('@playwright/test');
const path = require('path');
const { runStory, loadStory } = require('../../../demo/demo-engine');

// Point this at your running TSM server (Codespace forwarded port or localhost).
const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:8080';

test('HonorHealth / Healthcare executive demo', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  test.setTimeout(120_000);

  const story = loadStory(path.join(__dirname, '../../../demo/healthcare-demo.json'));
  const outDir = path.join(__dirname, 'screenshots', 'healthcare');

  await runStory(page, {
    steps: story.steps,
    outDir,
    presetLocalStorage: story.presetLocalStorage,
    baseURL: BASE_URL,
  });
});
TSMPATCHEOF

cat > tests/e2e/demo/hotelops-demo.spec.js << 'TSMPATCHEOF'
const { test } = require('@playwright/test');
const path = require('path');
const { runStory, loadStory } = require('../../../demo/demo-engine');

const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:8080';

test('HotelOps executive demo', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1920, height: 1080 });

  const story = loadStory(path.join(__dirname, '../../../demo/hotelops-demo.json'));
  const outDir = path.join(__dirname, 'screenshots', 'hotelops');

  await runStory(page, {
    steps: story.steps,
    outDir,
    presetLocalStorage: story.presetLocalStorage,
    baseURL: BASE_URL,
  });
});
TSMPATCHEOF

cat > tests/e2e/demo/insurance-demo.spec.js << 'TSMPATCHEOF'
const { test } = require('@playwright/test');
const path = require('path');
const { runStory, loadStory } = require('../../../demo/demo-engine');

// Point this at your running TSM server (Codespace forwarded port or localhost).
const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:8080';

test('Insurance executive demo', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  test.setTimeout(120_000);

  const story = loadStory(path.join(__dirname, '../../../demo/insurance-demo.json'));
  const outDir = path.join(__dirname, 'screenshots', 'insurance');

  await runStory(page, {
    steps: story.steps,
    outDir,
    presetLocalStorage: story.presetLocalStorage,
    baseURL: BASE_URL,
  });
});
TSMPATCHEOF

cat > tests/e2e/demo/legal-demo.spec.js << 'TSMPATCHEOF'
const { test } = require('@playwright/test');
const path = require('path');
const { runStory, loadStory } = require('../../../demo/demo-engine');

// Point this at your running TSM server (Codespace forwarded port or localhost).
const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:8080';

test('Legal executive demo', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  test.setTimeout(120_000);

  const story = loadStory(path.join(__dirname, '../../../demo/legal-demo.json'));
  const outDir = path.join(__dirname, 'screenshots', 'legal');

  await runStory(page, {
    steps: story.steps,
    outDir,
    presetLocalStorage: story.presetLocalStorage,
    baseURL: BASE_URL,
  });
});
TSMPATCHEOF

cat > tests/e2e/demo/mortgage-demo.spec.js << 'TSMPATCHEOF'
const { test } = require('@playwright/test');
const path = require('path');
const { runStory, loadStory } = require('../../../demo/demo-engine');

// Point this at your running TSM server (Codespace forwarded port or localhost).
const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:8080';

test('Mortgage executive demo', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  test.setTimeout(120_000);

  const story = loadStory(path.join(__dirname, '../../../demo/mortgage-demo.json'));
  const outDir = path.join(__dirname, 'screenshots', 'mortgage');

  await runStory(page, {
    steps: story.steps,
    outDir,
    presetLocalStorage: story.presetLocalStorage,
    baseURL: BASE_URL,
  });
});
TSMPATCHEOF

cat > tests/e2e/demo/plant-incident-demo.spec.js << 'TSMPATCHEOF'
const { test } = require('@playwright/test');
const path = require('path');
const { runStory, loadStory } = require('../../../demo/demo-engine');
const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:8080';
test('Plant Incident executive demo', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const story = loadStory(path.join(__dirname, '../../../demo/plant-incident-demo.json'));
  const outDir = path.join(__dirname, 'screenshots', 'plant-incident');
  await runStory(page, {
    steps: story.steps,
    outDir,
    presetLocalStorage: story.presetLocalStorage,
    baseURL: BASE_URL,
  });
});
TSMPATCHEOF

cat > tests/e2e/demo/realestate-demo.spec.js << 'TSMPATCHEOF'
const { test } = require('@playwright/test');
const path = require('path');
const { runStory, loadStory } = require('../../../demo/demo-engine');

// Point this at your running TSM server (Codespace forwarded port or localhost).
const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:8080';

test('Real Estate executive demo', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  test.setTimeout(120_000);

  page.on('dialog', async (dialog) => {
    console.warn(`[demo-engine] unexpected ${dialog.type()} on ${page.url()}: "${dialog.message()}"`);
    await dialog.dismiss();
  });

  // The strategist page has an undocumented auto-escalation timer that fires
  // 1800ms after load and jumps straight to the Exec Portal unless this flag
  // is set. Without it, the manual "Full Strategic Brief" click races the
  // auto-chain and the recording skips the brief step entirely.
  await page.addInitScript(() => {
    localStorage.setItem('tsm_auto_mode', 'off');
  });

  const story = loadStory(path.join(__dirname, '../../../demo/realestate-demo.json'));
  const outDir = path.join(__dirname, 'screenshots', 'realestate');

  await runStory(page, {
    steps: story.steps,
    outDir,
    presetLocalStorage: story.presetLocalStorage,
    baseURL: BASE_URL,
  });
});
TSMPATCHEOF

cat > tests/e2e/demo/schools-demo.spec.js << 'TSMPATCHEOF'
const { test } = require('@playwright/test');
const path = require('path');
const { runStory, loadStory } = require('../../../demo/demo-engine');

// Point this at your running TSM server (Codespace forwarded port or localhost).
const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:8080';

test('Schools executive demo', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  test.setTimeout(120_000);

  const story = loadStory(path.join(__dirname, '../../../demo/schools-demo.json'));
  const outDir = path.join(__dirname, 'screenshots', 'schools');

  await runStory(page, {
    steps: story.steps,
    outDir,
    presetLocalStorage: story.presetLocalStorage,
    baseURL: BASE_URL,
  });
});
TSMPATCHEOF

cat > tests/e2e/demo/supplier-shutdown-demo.spec.js << 'TSMPATCHEOF'
const { test } = require('@playwright/test');
const path = require('path');
const { runStory, loadStory } = require('../../../demo/demo-engine');
const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:8080';
test('Supplier Shutdown executive demo', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const story = loadStory(path.join(__dirname, '../../../demo/supplier-shutdown-demo.json'));
  const outDir = path.join(__dirname, 'screenshots', 'supplier-shutdown');
  await runStory(page, {
    steps: story.steps,
    outDir,
    presetLocalStorage: story.presetLocalStorage,
    baseURL: BASE_URL,
  });
});
TSMPATCHEOF

echo "All files written. Verifying syntax..."
node --check demo/demo-engine.js && echo "OK: demo/demo-engine.js"
python3 -c "import json; json.load(open('demo/finops-demo.json'))" && echo "OK: demo/finops-demo.json"
python3 -c "import json; json.load(open('demo/insurance-demo.json'))" && echo "OK: demo/insurance-demo.json"
python3 -c "import json; json.load(open('demo/realestate-demo.json'))" && echo "OK: demo/realestate-demo.json"
node --check tests/e2e/demo/bpo-demo.spec.js && echo "OK: tests/e2e/demo/bpo-demo.spec.js"
node --check tests/e2e/demo/construction-demo.spec.js && echo "OK: tests/e2e/demo/construction-demo.spec.js"
node --check tests/e2e/demo/cyber-incident-demo.spec.js && echo "OK: tests/e2e/demo/cyber-incident-demo.spec.js"
node --check tests/e2e/demo/finops-demo.spec.js && echo "OK: tests/e2e/demo/finops-demo.spec.js"
node --check tests/e2e/demo/healthcare-demo.spec.js && echo "OK: tests/e2e/demo/healthcare-demo.spec.js"
node --check tests/e2e/demo/hotelops-demo.spec.js && echo "OK: tests/e2e/demo/hotelops-demo.spec.js"
node --check tests/e2e/demo/insurance-demo.spec.js && echo "OK: tests/e2e/demo/insurance-demo.spec.js"
node --check tests/e2e/demo/legal-demo.spec.js && echo "OK: tests/e2e/demo/legal-demo.spec.js"
node --check tests/e2e/demo/mortgage-demo.spec.js && echo "OK: tests/e2e/demo/mortgage-demo.spec.js"
node --check tests/e2e/demo/plant-incident-demo.spec.js && echo "OK: tests/e2e/demo/plant-incident-demo.spec.js"
node --check tests/e2e/demo/realestate-demo.spec.js && echo "OK: tests/e2e/demo/realestate-demo.spec.js"
node --check tests/e2e/demo/schools-demo.spec.js && echo "OK: tests/e2e/demo/schools-demo.spec.js"
node --check tests/e2e/demo/supplier-shutdown-demo.spec.js && echo "OK: tests/e2e/demo/supplier-shutdown-demo.spec.js"
echo "Done."
