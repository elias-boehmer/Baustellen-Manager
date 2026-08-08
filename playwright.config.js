const { defineConfig, devices } = require('@playwright/test');

function normalizeUrl(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

const BASE_URL = normalizeUrl(process.env.E2E_BASE_URL || 'https://elias-boehmer.github.io/Baustellen-Manager/');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: { timeout: 7000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ]
});
