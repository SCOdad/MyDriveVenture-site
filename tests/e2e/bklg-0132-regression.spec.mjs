import { test, expect } from '@playwright/test';
import { installPageGuards, personas, signIn, selectDriverByName, currentAccessMode } from './helpers.mjs';

test.describe('BKLG-0132 critical browser regression', () => {
  test('DEV login surface loads without JavaScript failures', async ({ page }) => {
    const assertNoPageFailures = installPageGuards(page);
    await page.goto('/log/game/');
    await expect(page.locator('#login-form')).toBeVisible();
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-dv-environment', 'dev');
    assertNoPageFailures();
  });

  test('ordinary guardian authenticates and repeatedly switches managed drivers', async ({ page }) => {
    const assertNoPageFailures = installPageGuards(page);
    await signIn(page, personas.guardianMulti);
    await expect(page.locator('#driver-select option')).toHaveCount(2);

    await selectDriverByName(page, 'Synthetic Driver One');
    expect(await currentAccessMode(page)).toBe('MANAGE');
    await expect(page.locator('#drive-form button[type=submit]')).toBeEnabled();

    await selectDriverByName(page, 'Synthetic Driver Two');
    expect(await currentAccessMode(page)).toBe('MANAGE');
    await selectDriverByName(page, 'Synthetic Driver One');
    await selectDriverByName(page, 'Synthetic Driver Two');
    await selectDriverByName(page, 'Synthetic Driver One');
    assertNoPageFailures();
  });

  test('ordinary guardian can create and edit a deterministic DEV drive', async ({ page }) => {
    const assertNoPageFailures = installPageGuards(page);
    await signIn(page, personas.guardianMulti);
    await selectDriverByName(page, 'Synthetic Driver One');

    await page.evaluate(() => sessionStorage.setItem('dv:web-drive:submission-id', 'bklg-0132-playwright-log-drive-v1'));
    await page.locator('#drive-date').fill('2026-08-29');
    await page.locator('#drive-start').fill('10:00');
    await page.locator('#drive-end').fill('10:10');
    await page.locator('#drive-destination').fill('BKLG-0132 CI Route');
    await page.locator('#drive-notes').fill('BKLG-0132 deterministic browser fixture');
    await page.locator('#drive-form button[type=submit]').click();
    await expect(page.locator('#drive-status')).toContainText(/Drive logged|Drive updated|already/i, { timeout: 20_000 });

    const row = page.locator('#drive-list .drive-item').filter({ hasText: 'BKLG-0132 CI Route' }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.locator('[data-drive-detail-id]').click();
    await expect(page.locator('.drive-detail-dialog')).toBeVisible();
    await page.locator('[data-edit-drive]').click();
    await expect(page.locator('#drive-edit-context')).toBeVisible();
    await page.locator('#drive-notes').fill('BKLG-0132 deterministic browser fixture edited');
    await page.locator('#drive-form button[type=submit]').click();
    await expect(page.locator('#drive-status')).toContainText('Drive updated', { timeout: 20_000 });

    await page.locator('#drive-notes').fill('BKLG-0132 deterministic browser fixture');
    await page.locator('#drive-form button[type=submit]').click();
    await expect(page.locator('#drive-status')).toContainText('Drive updated', { timeout: 20_000 });
    assertNoPageFailures();
  });

  test('operator authenticates, sees VIEW-only drivers, and gets bounded admin edit controls', async ({ page }) => {
    const assertNoPageFailures = installPageGuards(page);
    await signIn(page, personas.operator);
    await expect(page.locator('#operator-driver-search')).toBeVisible({ timeout: 20_000 });
    await selectDriverByName(page, 'Synthetic Driver One');
    expect(await currentAccessMode(page)).toBe('VIEW');

    await selectDriverByName(page, 'Synthetic Driver Two');
    expect(await currentAccessMode(page)).toBe('VIEW');
    await selectDriverByName(page, 'Synthetic Driver One');

    const firstDrive = page.locator('#drive-list [data-drive-detail-id]').first();
    await expect(firstDrive).toBeVisible({ timeout: 20_000 });
    await firstDrive.click();
    await expect(page.getByRole('button', { name: 'Admin edit this drive' })).toBeVisible();
    await page.getByRole('button', { name: 'Admin edit this drive' }).click();
    await expect(page.locator('#drive-admin-reason-wrap')).toBeVisible();
    await expect(page.locator('#drive-admin-reason')).toBeRequired();
    assertNoPageFailures();
  });
});
