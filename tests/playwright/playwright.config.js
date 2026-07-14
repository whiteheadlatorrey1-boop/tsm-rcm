// tests/playwright/playwright.config.js
const path = require('path');

module.exports = {
  testDir: __dirname,
  timeout: 20000,
  retries: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: path.join(__dirname, '..', '..', 'reports', 'logs', 'playwright-results.json') }],
  ],
  use: {
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
};
