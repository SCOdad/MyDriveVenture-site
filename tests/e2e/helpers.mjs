import { expect } from '@playwright/test';

export const personas = {
  guardianMulti: 'guardian.multi@dev.driveventure.example.invalid',
  guardianSingle: 'guardian.single@dev.driveventure.example.invalid',
  driverOne: 'driver.one@dev.driveventure.example.invalid',
  operator: 'operator@dev.driveventure.example.invalid'
};

export const fixtureDrivers = {
  primaryMichigan: process.env.DV_E2E_MI_DRIVER_NAME || 'Synthetic Driver One',
  secondaryKansas: process.env.DV_E2E_KS_DRIVER_NAME || 'Synthetic Driver Two',
  boundedMichigan: process.env.DV_E2E_BOUNDED_MI_DRIVER_NAME || process.env.DV_E2E_MI_DRIVER_NAME || 'Synthetic Driver One',
  boundedMichiganGuardian: process.env.DV_E2E_BOUNDED_MI_GUARDIAN_EMAIL || personas.guardianMulti,
  singleMichigan: process.env.DV_E2E_SINGLE_MI_DRIVER_NAME || 'Synthetic Driver Three'
};

export const fixtureContracts = {
  guardianMultiMichigan: { email: personas.guardianMulti, driverName: fixtureDrivers.primaryMichigan, accessMode: 'MANAGE', requireSupervisor: true, requireVehicle: true, requireLessons: true },
  guardianMultiKansas: { email: personas.guardianMulti, driverName: fixtureDrivers.secondaryKansas, accessMode: 'MANAGE', requireSupervisor: true, requireVehicle: true, requireLessons: false },
  guardianSingleMichigan: { email: personas.guardianSingle, driverName: fixtureDrivers.singleMichigan, accessMode: 'MANAGE', requireSupervisor: true, requireVehicle: true, requireLessons: true },
  driverMichigan: { email: personas.driverOne, driverName: fixtureDrivers.primaryMichigan, accessMode: 'SELF', requireSupervisor: true, requireVehicle: true, requireLessons: true },
  operatorMichigan: { email: personas.operator, driverName: fixtureDrivers.primaryMichigan, accessMode: 'VIEW', requireSupervisor: false, requireVehicle: false, requireLessons: false }
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
  await page.goto('/log/');
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
  if ((await page.locator('#driver-heading').textContent())?.trim() === name) return;
  const option = page.locator('#driver-select option').filter({ hasText: name }).first();
  const value = await option.getAttribute('value');
  if (!value) throw new Error(`Driver option not found: ${name}`);
  await page.locator('#driver-select').selectOption(value);
  await expect(page.locator('#driver-heading')).toHaveText(name);
}

export async function currentAccessMode(page) {
  return page.evaluate(() => window.DV_LOG_APP?.getAccessMode?.(window.DV_LOG_APP?.getDriverId?.()) || null);
}


export async function fixtureDiagnostics(page, { email = null, driverName = null } = {}) {
  return page.evaluate(({ email, driverName }) => {
    const app = window.DV_LOG_APP;
    const driverSelect = document.querySelector('#driver-select');
    const supervisor = document.querySelector('#drive-supervisor');
    const vehicle = document.querySelector('#drive-vehicle');
    const lessons = [...document.querySelectorAll('#drive-lesson-options input[type=checkbox]')];
    const driverId = app?.getDriverId?.() || driverSelect?.value || null;
    return {
      email,
      expected_driver: driverName,
      heading: document.querySelector('#driver-heading')?.textContent?.trim() || null,
      selected_driver_id: driverId,
      available_drivers: [...(driverSelect?.options || [])].map(option => ({
        value: option.value,
        text: option.textContent?.trim() || ''
      })).filter(option => option.value),
      access_mode: driverId ? (app?.getAccessMode?.(driverId) || null) : null,
      supervisor: {
        visible: Boolean(supervisor && supervisor.offsetParent !== null),
        value: supervisor?.value || null,
        canonical_options: [...(supervisor?.options || [])]
          .filter(option => option.value && option.value !== 'OTHER').length
      },
      vehicle: {
        visible: Boolean(vehicle && vehicle.offsetParent !== null),
        value: vehicle?.value || null,
        options: [...(vehicle?.options || [])].filter(option => option.value).length
      },
      lessons: {
        visible: Boolean(document.querySelector('#drive-lesson-options')?.offsetParent !== null),
        count: lessons.length
      },
      submit_enabled: document.querySelector('#drive-form button[type=submit]')?.disabled === false
    };
  }, { email, driverName });
}

async function fixtureFailure(page, message, context) {
  const diagnostics = await fixtureDiagnostics(page, context).catch(error => ({ diagnostic_error: error.message }));
  throw new Error(`${message}\nBKLG-0210 fixture diagnostics:\n${JSON.stringify(diagnostics, null, 2)}`);
}

export async function waitForAuthenticatedApp(page, { email = null, timeout = 20_000 } = {}) {
  try {
    await expect(page.locator('#app-main')).toBeVisible({ timeout });
    await expect(page.locator('#driver-heading')).not.toHaveText('Drive Venture', { timeout });
    await page.waitForFunction(() => Boolean(window.DV_LOG_APP?.getDriverId?.()), null, { timeout });
  } catch (error) {
    await fixtureFailure(page, `Authenticated app did not become ready: ${error.message}`, { email });
  }
}

export async function waitForFixtureReady(page, {
  email = null,
  driverName,
  accessMode = null,
  requireSupervisor = true,
  requireVehicle = true,
  requireLessons = false,
  timeout = 20_000
} = {}) {
  if (!driverName) throw new Error('waitForFixtureReady requires driverName.');

  try {
    await selectDriverByName(page, driverName);
    await expect(page.locator('#driver-heading')).toHaveText(driverName, { timeout });

    if (accessMode) {
      await expect.poll(() => currentAccessMode(page), {
        timeout,
        message: `Expected ${driverName} access mode to become ${accessMode}`
      }).toBe(accessMode);
    }

    if (requireSupervisor) {
      const supervisor = page.locator('#drive-supervisor');
      await expect(supervisor).toBeVisible({ timeout });
      await expect.poll(
        () => supervisor.locator('option').evaluateAll(options =>
          options.filter(option => option.value && option.value !== 'OTHER').length
        ),
        { timeout, message: 'Expected at least one canonical supervisor option in DEV form context' }
      ).toBeGreaterThan(0);
      if (!(await supervisor.inputValue())) {
        const canonical = await supervisor.locator('option').evaluateAll(options =>
          options.find(option => option.value && option.value !== 'OTHER')?.value || ''
        );
        if (canonical) await supervisor.selectOption(canonical);
      }
      await expect(supervisor).not.toHaveValue('', { timeout });
    }

    if (requireVehicle) {
      const vehicle = page.locator('#drive-vehicle');
      await expect(vehicle).toBeVisible({ timeout });
      await expect.poll(
        () => vehicle.locator('option').evaluateAll(options => options.filter(option => option.value).length),
        { timeout, message: 'Expected at least one vehicle option in DEV form context' }
      ).toBeGreaterThan(0);
    }

    if (requireLessons) {
      await expect(page.locator('#drive-lesson-options')).toBeVisible({ timeout });
      await expect.poll(
        () => page.locator('#drive-lesson-options input[type=checkbox]').count(),
        { timeout, message: 'Expected Skills Practiced options in DEV form context' }
      ).toBeGreaterThan(0);
    }

    await expect(page.locator('#drive-form button[type=submit]')).toBeEnabled({ timeout });
  } catch (error) {
    await fixtureFailure(page, `DEV fixture did not become ready: ${error.message}`, { email, driverName });
  }
}

export async function signInFixture(page, {
  email,
  driverName,
  accessMode = null,
  requireSupervisor = true,
  requireVehicle = true,
  requireLessons = false,
  timeout = 20_000
}) {
  await signIn(page, email);
  await waitForAuthenticatedApp(page, { email, timeout });
  await waitForFixtureReady(page, {
    email,
    driverName,
    accessMode,
    requireSupervisor,
    requireVehicle,
    requireLessons,
    timeout
  });
}
