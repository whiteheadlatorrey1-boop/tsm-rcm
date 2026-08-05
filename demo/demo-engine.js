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
 *   "fullPage": true,                           // default true; set false for viewport-only shot
 *   "timeout": 60000                            // overrides the default 15000ms for this step's
 *                                                // click/waitFor/waitForFunction. Use on steps that
 *                                                // wait on real (non-mocked) sequential API calls
 *                                                // (e.g. multi-engine AI analysis), which can run
 *                                                // long under third-party rate limits.
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

  // Surface browser-side console errors and uncaught exceptions in the
  // Playwright/terminal output — without this, a JS error mid-page-script
  // (e.g. inside an async handler like fireEngines()) fails silently in
  // the browser and only shows up here as a downstream "element not
  // visible" timeout with no indication of the real cause.
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`[page console error] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    console.log(`[page uncaught exception] ${err.message}`);
  });
  page.on('requestfailed', (req) => {
    console.log(`[page request failed] ${req.method()} ${req.url()} -- ${req.failure()?.errorText}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      console.log(`[page response ${res.status()}] ${res.url()}`);
    }
  });

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
      try {
        await page.click(step.click, { timeout: step.timeout || 15000 });
        console.log(`[demo-engine] step "${step.shot}" click landed, page now ${page.url()}`);
      } catch (err) {
        console.error(`[demo-engine] click "${step.click}" FAILED on step "${step.shot}" (page: ${page.url()}) -- ${err.message}`);

        // Diagnose *why* it failed before moving on -- was the element missing,
        // hidden, disabled, zero-size, or just covered by something else?
        const diag = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return { found: false };
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          const centerX = r.left + r.width / 2;
          const centerY = r.top + r.height / 2;
          const topEl = document.elementFromPoint(centerX, centerY);
          return {
            found: true,
            visible: r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden',
            disabled: !!el.disabled,
            display: cs.display,
            visibility: cs.visibility,
            opacity: cs.opacity,
            pointerEvents: cs.pointerEvents,
            rect: { x: r.left, y: r.top, w: r.width, h: r.height },
            coveredBy: (topEl && topEl !== el && !el.contains(topEl))
              ? (topEl.id ? `#${topEl.id}` : topEl.className ? `.${String(topEl.className).split(' ')[0]}` : topEl.tagName)
              : null,
          };
        }, step.click).catch((e) => ({ found: 'unknown', evalError: e.message }));

        console.error(`[demo-engine] target diagnostics for "${step.click}":`, JSON.stringify(diag));

        // Capture the page exactly as it was at the moment of failure -- this is
        // the screenshot that's been missing; without it a click failure just
        // looks like the run silently stopped one step early.
        const failFile = path.join(outDir, `${step.shot}-CLICK-FAILED.png`);
        await page.screenshot({ path: failFile, fullPage: true }).catch((e) =>
          console.error(`[demo-engine] failure screenshot itself failed: ${e.message}`)
        );
        console.error(`[demo-engine] captured failure state -> ${failFile}`);

        // Don't throw: continue the story so later steps (and their own
        // waitFor/click diagnostics) still get a chance to report in, instead
        // of one click swallowing all remaining visibility into the run.
      }
    }

    if (step.setLocalStorage) {
      await page.evaluate((entries) => {
        for (const [key, value] of Object.entries(entries)) {
          try { window.localStorage.setItem(key, value); } catch (e) { /* ignore */ }
        }
      }, step.setLocalStorage);
      console.log(`[demo-engine] step "${step.shot}" setLocalStorage applied: ${JSON.stringify(step.setLocalStorage)}`);
    }
    if (step.waitFor) {
      const t = step.timeout || 15000;
      await page.waitForSelector(step.waitFor, { timeout: t }).catch(() => {
        console.warn(`[demo-engine] waitFor "${step.waitFor}" timed out (${t}ms) on step "${step.shot}" (page: ${page.url()}) — capturing anyway`);
      });
    }

    if (step.waitForFunction) {
      const t = step.timeout || 15000;
      await page.waitForFunction(step.waitForFunction, { timeout: t }).catch(() => {
        console.warn(`[demo-engine] waitForFunction "${step.waitForFunction}" timed out (${t}ms) on step "${step.shot}" (page: ${page.url()}) — capturing anyway`);
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
