// tests/playwright/playwright.config.js
const path = require('path');

// Single source of truth for the test port. check-playwright.sh exports
// BASE_URL (derived from DEMO_TEST_PORT, default 4173) before invoking
// Playwright, so that's the normal path. TEST_PORT exists as a fallback
// for anyone spawning a fresh server straight from this config (no
// BASE_URL set) -- it keeps webServer.command's PORT env and
// webServer.url/use.baseURL's port in agreement with each other.
const TEST_PORT = process.env.TEST_PORT || '4173';
const BASE_URL = process.env.BASE_URL || `http://localhost:${TEST_PORT}`;

module.exports = {
  testDir: __dirname,
  timeout: 20000,
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: path.join(__dirname, '..', '..', 'reports', 'logs', 'playwright-results.json') }],
  ],
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'off', // spec.js takes its own targeted screenshots on failure
    launchOptions: {
      args: ['--disable-dev-shm-usage'], // Chromium falls back to /tmp instead of
                                          // /dev/shm, which Codespaces/Docker caps
                                          // at 64MB by default — undersized for
                                          // renderer processes on heavier pages,
                                          // causing silent "Page crashed" failures
                                          // with no console output or screenshot.
    },
  },
  // This config previously had no webServer block at all, unlike the root
  // playwright.config.js -- so nothing here ever started server.js. Every
  // page.goto() in the spec was assuming a server that had to be started
  // manually and separately. reuseExistingServer:true means this is safe
  // to leave in even when check-playwright.sh (or you, manually) already
  // has `node server.js` running on TEST_PORT in another process --
  // Playwright detects it via the url check below and won't spawn a
  // second one.
  webServer: {
    command: `PORT=${TEST_PORT} node ` + path.join(__dirname, '..', '..', 'server.js'),
    url: `${BASE_URL}/html/healthcare/hc-main-strategist.html`,
    reuseExistingServer: true,
    timeout: 30000,
  },
};
