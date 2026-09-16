import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e-prod',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['github'], ['html', { outputFolder: 'playwright-report-prod', open: 'never' }]],
  use: {
    baseURL: 'https://mydriveventure.com',
    browserName: 'chromium',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: false
  },
  outputDir: 'test-results-prod'
});
