// tests/playwright/playwright.config.js
const path = require('path');

module.exports = {
  testDir: __dirname,
  timeout: 20000,
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: path.join(__dirname, '..', '..', 'reports', 'logs', 'playwright-results.json') }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
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
  // manually and separately, and the EADDRINUSE:8080 seen earlier turned
  // out to be a stale/unrelated process, not the app -- ERR_CONNECTION_REFUSED
  // is Playwright confirming nothing was actually listening on 8080.
  // reuseExistingServer:true means this is safe to leave in even when you
  // DO already have `node server.js` running in another terminal.
  webServer: {
    command: 'node ' + path.join(__dirname, '..', '..', 'server.js'),
    url: (process.env.BASE_URL || 'http://localhost:8080') + '/html/healthcare/hc-main-strategist.html',
    reuseExistingServer: true,
    timeout: 30000,
  },
};
