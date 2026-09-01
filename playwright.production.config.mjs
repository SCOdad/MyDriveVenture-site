import {defineConfig} from '@playwright/test';

if(process.env.DV_E2E_PRODUCTION!=='1'){
  throw new Error('Production Playwright requires explicit DV_E2E_PRODUCTION=1 authorization');
}

export default defineConfig({
  testDir:'./tests/e2e',
  testMatch:'bklg-0148-dv03-production.spec.mjs',
  timeout:45_000,
  expect:{timeout:10_000},
  fullyParallel:false,
  retries:0,
  workers:1,
  reporter:'list',
  use:{
    baseURL:'https://mydriveventure.com',
    browserName:'chromium',
    headless:true,
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
    video:'retain-on-failure',
    ignoreHTTPSErrors:false
  },
  outputDir:'test-results/production-dv03'
});
