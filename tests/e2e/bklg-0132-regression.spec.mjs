import { test, expect } from '@playwright/test';
import { installPageGuards, personas, signIn, selectDriverByName, currentAccessMode } from './helpers.mjs';

async function submitDriveForm(page) {
  const responsePromise = page.waitForResponse(response =>
    response.url().includes('/functions/v1/drive-ops') && response.request().method() === 'POST',
    { timeout: 20_000 }
  );
  await page.locator('#drive-form button[type=submit]').click();
  const response = await responsePromise;
  let body = null;
  try { body = await response.json(); } catch { body = null; }
  expect(response.status(), `drive-ops response: ${JSON.stringify(body)}`).toBe(200);
  expect(body?.ok, `drive-ops response: ${JSON.stringify(body)}`).toBe(true);
  return body;
}

test.describe('BKLG-0132 critical browser regression', () => {
  test('DEV login surface loads without JavaScript failures', async ({ page }) => {
    const assertNoPageFailures = installPageGuards(page);
    await page.goto('/log/game/');
    await expect(page.locator('#login-form')).toBeVisible();
    await expect(page.locator('#login-email')).toBeVisible();
    const environment = await page.evaluate(() => ({
      name: window.DV_ENVIRONMENT_CONFIG?.name || null,
      projectRef: window.DV_ENVIRONMENT_CONFIG?.projectRef || null
    }));
    expect(environment).toEqual({ name: 'dev', projectRef: 'safwylxxhywbsfxpmchd' });
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

  test('ordinary guardian can create and edit an isolated DEV drive', async ({ page }, testInfo) => {
    const assertNoPageFailures = installPageGuards(page);
    await signIn(page, personas.guardianMulti);
    await selectDriverByName(page, 'Synthetic Driver One');

    const runId = process.env.GITHUB_RUN_ID || `${Date.now()}`;
    const runAttempt = process.env.GITHUB_RUN_ATTEMPT || 'local';
    const sourceEventId = `bklg-0132-playwright-${runId}-${runAttempt}-${testInfo.retry}`;
    await page.evaluate(id => sessionStorage.setItem('dv:web-drive:submission-id', id), sourceEventId);
    await page.locator('#drive-date').fill('2026-08-29');
    await page.locator('#drive-start').fill('10:00');
    await page.locator('#drive-end').fill('10:10');
    await page.locator('#drive-destination').fill('BKLG-0132 CI Route');
    await page.locator('#drive-notes').fill('BKLG-0132 deterministic browser fixture');
    const logged = await submitDriveForm(page);
    expect(logged?.drive?.id).toBeTruthy();

    const row = page.locator('#drive-list .drive-item').filter({ hasText: 'BKLG-0132 CI Route' }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row).toHaveAttribute('data-drive-detail-id', logged.drive.id);
    await row.click();
    await expect(page.locator('.drive-detail-dialog')).toBeVisible();
    await page.locator('[data-edit-drive]').click();
    await expect(page.locator('#drive-edit-context')).toBeVisible();
    await page.locator('#drive-notes').fill('BKLG-0132 deterministic browser fixture edited');
    const edited = await submitDriveForm(page);
    expect(edited?.drive?.notes).toBe('BKLG-0132 deterministic browser fixture edited');

    await page.locator('#drive-notes').fill('BKLG-0132 deterministic browser fixture');
    const restored = await submitDriveForm(page);
    expect(restored?.drive?.notes).toBe('BKLG-0132 deterministic browser fixture');
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
    await expect(page.locator('#drive-admin-reason')).toHaveJSProperty('required', true);
    assertNoPageFailures();
  });
});
