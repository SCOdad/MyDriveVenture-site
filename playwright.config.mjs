import { defineConfig } from '@playwright/test';

const baseURL = process.env.DV_E2E_BASE_URL || 'https://mydriveventure-dev.pages.dev';
const isCloudflareDev = /^https:\/\/([a-z0-9-]+\.)*mydriveventure-dev\.pages\.dev\/?$/i.test(baseURL);
const isLocalDev = /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\/?$/i.test(baseURL);
if (!isCloudflareDev && !isLocalDev) {
  throw new Error(`BKLG-0132 refuses non-DEV Playwright target: ${baseURL}`);
}

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { outputFolder: 'playwright-report', open: 'never' }]] : 'list',
  use: {
    baseURL,
    browserName: 'chromium',
    launchOptions: process.env.DV_PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.DV_PLAYWRIGHT_EXECUTABLE_PATH }
      : {},
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: false
  },
  outputDir: 'test-results',
  webServer: isLocalDev ? {
    command: 'python3 -m http.server 4173',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 10_000
  } : undefined
});
