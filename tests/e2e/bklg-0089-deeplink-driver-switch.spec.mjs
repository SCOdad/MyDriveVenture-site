import { test, expect } from '@playwright/test';
import { installPageGuards, personas, signIn, selectDriverByName } from './helpers.mjs';

test('BKLG-0089 deep-linked driver does not remain sticky after manual switching', async ({ page }) => {
  const assertNoPageFailures = installPageGuards(page);
  await signIn(page, personas.guardianMulti);

  const driverOne = page.locator('#driver-select option').filter({ hasText: 'Synthetic Driver One' }).first();
  const driverTwo = page.locator('#driver-select option').filter({ hasText: 'Synthetic Driver Two' }).first();
  const driverOneId = await driverOne.getAttribute('value');
  const driverTwoId = await driverTwo.getAttribute('value');
  expect(driverOneId).toBeTruthy();
  expect(driverTwoId).toBeTruthy();

  await page.goto(`/log/?driver=${encodeURIComponent(driverOneId)}`);
  await expect(page.locator('#app-main')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('#driver-heading')).toHaveText('Synthetic Driver One', { timeout: 20_000 });
  await expect(page.locator('#driver-select')).toHaveValue(driverOneId);
  expect(new URL(page.url()).searchParams.get('driver')).toBe(driverOneId);

  await selectDriverByName(page, 'Synthetic Driver Two');
  await expect(page.locator('#driver-select')).toHaveValue(driverTwoId);
  expect(new URL(page.url()).searchParams.get('driver')).toBe(driverTwoId);

  await selectDriverByName(page, 'Synthetic Driver One');
  await expect(page.locator('#driver-select')).toHaveValue(driverOneId);
  expect(new URL(page.url()).searchParams.get('driver')).toBe(driverOneId);

  await selectDriverByName(page, 'Synthetic Driver Two');
  await expect(page.locator('#driver-select')).toHaveValue(driverTwoId);
  expect(new URL(page.url()).searchParams.get('driver')).toBe(driverTwoId);

  assertNoPageFailures();
});

test('BKLG-0089 driver switching preserves an editDrive parameter until certification review consumes it', async ({ page }) => {
  const assertNoPageFailures = installPageGuards(page);
  await signIn(page, personas.guardianMulti);
  const first = page.locator('#driver-select option').filter({ hasText: 'Synthetic Driver One' }).first();
  const second = page.locator('#driver-select option').filter({ hasText: 'Synthetic Driver Two' }).first();
  const firstId = await first.getAttribute('value');
  const secondId = await second.getAttribute('value');
  expect(firstId).toBeTruthy();
  expect(secondId).toBeTruthy();

  await page.goto(`/log/?driver=${encodeURIComponent(firstId)}&editDrive=nonexistent-bklg0089-fixture`);
  await expect(page.locator('#app-main')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('#driver-heading')).toHaveText('Synthetic Driver One', { timeout: 20_000 });

  // The certification review handler is allowed to consume editDrive. If it has not yet
  // done so, a driver switch must not be the code path that removes it.
  const editBefore = new URL(page.url()).searchParams.get('editDrive');
  await selectDriverByName(page, 'Synthetic Driver Two');
  expect(new URL(page.url()).searchParams.get('driver')).toBe(secondId);
  if (editBefore) expect(new URL(page.url()).searchParams.get('editDrive')).toBe(editBefore);

  assertNoPageFailures();
});
