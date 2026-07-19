#!/usr/bin/env node
/**
 * check-console-errors.js
 *
 * A curl/status-code check can only prove a page LOADS. It cannot catch:
 *   - JavaScript console errors (typos, missing elements, bad references)
 *   - Uncaught exceptions thrown during page load or on interaction
 *   - Failed network requests the page makes internally (e.g. a broken
 *     /api/... call that the page's own JS fires after load)
 *
 * This script actually opens each page in a real (headless) Chrome instance
 * via Puppeteer, and captures all three of the above — automatically, across
 * every page in the list, instead of you manually opening 18 tabs and
 * watching DevTools by hand.
 *
 * SETUP (one-time, run in your codespace — not in a restricted sandbox):
 *   npm install puppeteer
 *
 * USAGE:
 *   node check-console-errors.js                          # defaults to localhost:8080
 *   node check-console-errors.js https://tsm-consultz.fly.dev
 *
 * NOTE: this only catches errors that fire on page LOAD. It does not click
 * buttons or interact with the page. If you want to check what happens when
 * someone clicks "Ask AI" or triggers a fault in the Enterprise Command
 * Center, that still needs a manual pass, or a follow-up script targeting
 * specific interactions — this is the automatable 80%, not the full 100%.
 */

const puppeteer = require('puppeteer');

const BASE_URL = process.argv[2] || 'http://localhost:8080';

const PAGES = [
  // Platform hub itself
  '/html/tsm-platform-hub.html',

  // Music (the one we just fixed — worth including as a regression check)
  '/music',

  // Industry Track
  '/html/healthcare/hc-denial-war-room.html',
  '/html/finops-suite/finops-war-room.html',
  '/html/tsm-insurance/insurance-war-room.html',
  '/html/construction-suite/construction-war-room.html',
  '/html/legal-pro/legal-war-room.html',
  '/html/reo-pro/re-war-room.html',
  '/html/war-rooms/bpo/bpo-war-room.html',
  '/html/war-rooms/bpo/bpo-strategist.html',
  '/html/war-rooms/bpo/bpo-executive-portal.html',
  '/html/war-rooms/mortgage/mortgage-war-room.html',
  '/html/war-rooms/mortgage/mortgage-strategist.html',
  '/html/war-rooms/mortgage/mortgage-executive-portal.html',

  // Honeywell scenarios
  '/html/plant-incident.html',
  '/html/cyber-incident.html',
  '/html/supplier-shutdown.html',

  // The Enterprise Command Center itself
  '/html/enterprise-command-center.html',
];

async function checkPage(browser, path) {
  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  page.on('response', (res) => {
    if (res.status() >= 400) {
      failedRequests.push(`${res.status()} ${res.url()}`);
    }
  });

  let loadError = null;
  try {
    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle2', timeout: 15000 });
    // Give any deferred/async scripts a moment to fire and log errors.
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (err) {
    loadError = err.message;
  }

  await page.close();

  return { path, loadError, consoleErrors, pageErrors, failedRequests };
}

async function main() {
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`Checking ${PAGES.length} pages for console errors, uncaught exceptions, and failed requests...`);
  console.log('='.repeat(70));

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'], // needed in most containerized/codespace environments
  });

  let cleanCount = 0;
  let dirtyCount = 0;

  for (const path of PAGES) {
    const result = await checkPage(browser, path);
    const hasIssues =
      result.loadError ||
      result.consoleErrors.length > 0 ||
      result.pageErrors.length > 0 ||
      result.failedRequests.length > 0;

    if (hasIssues) {
      dirtyCount += 1;
      console.log(`\n❌ ${path}`);
      if (result.loadError) {
        console.log(`   Failed to load: ${result.loadError}`);
      }
      result.consoleErrors.forEach((e) => console.log(`   [console.error] ${e}`));
      result.pageErrors.forEach((e) => console.log(`   [uncaught exception] ${e}`));
      result.failedRequests.forEach((e) => console.log(`   [failed request] ${e}`));
    } else {
      cleanCount += 1;
      console.log(`✅ ${path}`);
    }
  }

  await browser.close();

  console.log('\n' + '='.repeat(70));
  console.log(`${cleanCount} clean, ${dirtyCount} with issues, out of ${PAGES.length} total.`);
  console.log('');
  console.log('Reminder: this only checks what happens on page LOAD. Buttons,');
  console.log('fault-injection clicks, and "Ask AI" calls still need a manual');
  console.log('click-through pass before you fully trust any single page live.');

  process.exit(dirtyCount === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Script crashed:', err);
  process.exit(1);
});