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
    headless: true,
    screenshot: 'off', // spec.js takes its own targeted screenshots on failure
  },
};
