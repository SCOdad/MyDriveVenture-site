import { test, expect } from '@playwright/test';
import { fixtureDrivers, installPageGuards, personas, signIn, waitForAuthenticatedApp } from './helpers.mjs';

test('late driver-status response cannot repaint a newer driver selection', async ({ page }) => {
  const assertNoPageFailures = installPageGuards(page);
  await signIn(page, personas.guardianMulti);
  await waitForAuthenticatedApp(page, { email: personas.guardianMulti });

  const drivers = await page.locator('#driver-select option').evaluateAll(options =>
    options.filter(option => option.value).map(option => ({ id: option.value, name: option.textContent.trim().replace(/ · View only$/, '') }))
  );
  expect(drivers.length).toBeGreaterThanOrEqual(2);

  const currentId = await page.evaluate(() => window.DV_LOG_APP.getDriverId());
  const current = drivers.find(driver => driver.id === currentId);
  const slow = drivers.find(driver => driver.id !== currentId);
  expect(current).toBeTruthy();
  expect(slow).toBeTruthy();

  let releaseSlow;
  const slowReleased = new Promise(resolve => { releaseSlow = resolve; });
  let intercepted;
  const interceptedPromise = new Promise(resolve => { intercepted = resolve; });

  await page.route('**/rest/v1/rpc/get_authenticated_driver_status_v1', async route => {
    let body = {};
    try { body = route.request().postDataJSON() || {}; } catch {}
    if (String(body.p_driver_id) !== String(slow.id)) {
      await route.continue();
      return;
    }
    intercepted();
    await slowReleased;
    await route.continue();
  });

  const generationBefore = await page.evaluate(() => window.DV_LOG_APP.getRenderGeneration());
  await page.locator('#driver-select').selectOption(slow.id);
  await interceptedPromise;
  await expect(page.locator('#driver-heading')).toHaveText(slow.name);

  await page.locator('#driver-select').selectOption(current.id);
  await expect(page.locator('#driver-heading')).toHaveText(current.name);
  const generationAfterReturn = await page.evaluate(() => window.DV_LOG_APP.getRenderGeneration());
  expect(generationAfterReturn).toBeGreaterThan(generationBefore);

  releaseSlow();
  await page.waitForTimeout(250);

  await expect(page.locator('#driver-heading')).toHaveText(current.name);
  expect(await page.evaluate(() => window.DV_LOG_APP.getDriverId())).toBe(current.id);
  expect(await page.evaluate(() => window.DV_LOG_APP.getRenderGeneration())).toBe(generationAfterReturn);
  assertNoPageFailures();
});
