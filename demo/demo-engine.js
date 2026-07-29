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
 */

const fs = require('fs');
const path = require('path');

async function runStory(page, { steps, outDir, baseURL = '' }) {
  fs.mkdirSync(outDir, { recursive: true });

  for (const step of steps) {
    if (step.goto) {
      const url = step.goto.startsWith('http') ? step.goto : `${baseURL}${step.goto}`;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
    }

    if (step.fill) {
      for (const [selector, value] of Object.entries(step.fill)) {
        await page.fill(selector, value);
      }
    }

    if (step.click) {
      await page.click(step.click);
    }

    if (step.waitFor) {
      await page.waitForSelector(step.waitFor, { timeout: 15000 }).catch(() => {
        console.warn(`[demo-engine] waitFor "${step.waitFor}" timed out on step "${step.shot}" — capturing anyway`);
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
