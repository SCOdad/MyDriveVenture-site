import { test, expect } from '@playwright/test';
import { fixtureContracts, signInFixture, signIn, selectDriverByName, currentAccessMode } from './helpers.mjs';

for (const [name, contract] of Object.entries(fixtureContracts).filter(([, value]) => value.accessMode !== 'VIEW')) {
  test(`BKLG-0210 fixture contract: ${name}`, async ({ page }) => {
    await signInFixture(page, contract);
    expect(await currentAccessMode(page)).toBe(contract.accessMode);
  });
}

test('BKLG-0210 fixture contract: operatorMichigan', async ({ page }) => {
  const contract = fixtureContracts.operatorMichigan;
  await signIn(page, contract.email);
  await expect(page.locator('#operator-driver-search')).toBeVisible({ timeout: 20_000 });
  await selectDriverByName(page, contract.driverName);
  await expect.poll(() => currentAccessMode(page), { timeout: 20_000 }).toBe(contract.accessMode);
});
