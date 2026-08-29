import { expect } from '@playwright/test';

export const personas = {
  guardianMulti: 'guardian.multi@dev.driveventure.example.invalid',
  guardianSingle: 'guardian.single@dev.driveventure.example.invalid',
  driverOne: 'driver.one@dev.driveventure.example.invalid',
  operator: 'operator@dev.driveventure.example.invalid'
};

export function requireTestPassword() {
  const password = process.env.DV_DEV_TEST_PASSWORD;
  if (!password) throw new Error('DV_DEV_TEST_PASSWORD is required for authenticated Playwright tests.');
  return password;
}

export function installPageGuards(page) {
  const failures = [];
  page.on('pageerror', error => failures.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') failures.push(`console.error: ${message.text()}`);
  });
  page.on('requestfailed', request => {
    const url = request.url();
    if (/\.(?:js|mjs)(?:\?|$)/i.test(url)) failures.push(`script request failed: ${url} (${request.failure()?.errorText || 'unknown'})`);
  });
  return () => {
    expect(failures, failures.join('\n')).toEqual([]);
  };
}

export async function signIn(page, email) {
  const password = requireTestPassword();
  await page.goto('/log/game/');
  await page.waitForFunction(() => Boolean(window.DV_APP_CONFIG?.supabaseUrl && window.supabase?.createClient));
  const result = await page.evaluate(async ({ email, password }) => {
    const cfg = window.DV_APP_CONFIG;
    const client = window.DV_SUPABASE_CLIENT || window.supabase.createClient(cfg.supabaseUrl, cfg.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    window.DV_SUPABASE_CLIENT = client;
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    return { ok: !error && Boolean(data?.session), error: error?.message || null };
  }, { email, password });
  if (!result.ok) throw new Error(`DEV sign-in failed for ${email}: ${result.error || 'no session returned'}`);
  await page.reload();
  await expect(page.locator('#app-main')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('#driver-heading')).not.toHaveText('Drive Venture', { timeout: 20_000 });
}

export async function selectDriverByName(page, name) {
  const option = page.locator('#driver-select option').filter({ hasText: name }).first();
  const value = await option.getAttribute('value');
  if (!value) throw new Error(`Driver option not found: ${name}`);
  await page.locator('#driver-select').selectOption(value);
  await expect(page.locator('#driver-heading')).toHaveText(name);
}

export async function currentAccessMode(page) {
  return page.evaluate(() => window.DV_LOG_APP?.getAccessMode?.(window.DV_LOG_APP?.getDriverId?.()) || null);
}
