import { test, expect } from '@playwright/test';
import { installPageGuards, personas, signIn, selectDriverByName } from './helpers.mjs';

async function openAuthenticatedExperience(page, path) {
  await signIn(page, personas.guardianMulti);
  if (path !== '/log/') {
    await page.goto(path);
    await expect(page.locator('#app-main')).toBeVisible({ timeout: 20_000 });
  }
  await selectDriverByName(page, 'Synthetic Driver One');
  await expect(page.locator('#drive-supervisor')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('#drive-lesson-options input[type=checkbox]')).toHaveCount(13, { timeout: 20_000 });
  await expect(page.locator('#drive-notes-meta')).toContainText('500 character maximum');
  await expect(page.locator('#drive-log-export')).toBeVisible();
}

for (const experience of [
  { name: 'Classic', path: '/log/DV00/', route: 'dv00' },
  { name: 'Old Experience', path: '/log/DV02/', route: 'dv02' },
  { name: 'Current Experience', path: '/log/', route: 'dv03' }
]) {
  test(`${experience.name} exposes the shared BKLG-0151 drive contract`, async ({ page }) => {
    const assertNoPageFailures = installPageGuards(page);
    await openAuthenticatedExperience(page, experience.path);
    await expect(page.locator('html')).toHaveAttribute('data-dv-route', experience.route);
    if (experience.route === 'dv00') await expect(page.locator('.concept-switch')).toContainText('Classic');
    else await expect(page.locator('.experience-bar')).toContainText(experience.name);
    assertNoPageFailures();
  });
}

test('DV01 direct route retires to Current Experience and preserves query/hash', async ({ page }) => {
  await page.goto('/log/DV01/?driver=test#trip');
  await page.waitForURL(/\/log\/\?driver=test#trip$/);
  expect(new URL(page.url()).pathname).toBe('/log/');
});

async function expectSkillCheckboxPresentation(page, expectedColumns) {
  const cards = page.locator('.drive-skill-option');
  await expect(cards).toHaveCount(13);
  const gridColumns = await page.locator('#drive-lesson-options').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(gridColumns).toBe(expectedColumns);
  const compatibilitySelect = await page.locator('#drive-lesson').evaluate(el => {
    const style = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    return { display: style.display, visibility: style.visibility, width: box.width, height: box.height };
  });
  expect(compatibilitySelect.display).toBe('none');
  const result = await cards.evaluateAll(nodes => nodes.map(card => {
    const box = card.getBoundingClientRect();
    const label = card.querySelector('span');
    const labelBox = label.getBoundingClientRect();
    const check = getComputedStyle(label, '::before');
    return {
      labelInside: labelBox.left >= box.left && labelBox.right <= box.right + 1 && labelBox.top >= box.top && labelBox.bottom <= box.bottom + 1,
      overflowX: card.scrollWidth > card.clientWidth + 1,
      checkWidth: parseFloat(check.width),
      checkHeight: parseFloat(check.height),
      checkBorder: parseFloat(check.borderLeftWidth)
    };
  }));
  expect(result.every(x => x.labelInside && !x.overflowX && x.checkWidth >= 14 && x.checkHeight >= 14 && x.checkBorder >= 1)).toBe(true);
}

test('Skills Practiced cards contain visible checkbox and full label on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await openAuthenticatedExperience(page, '/log/');
  await expectSkillCheckboxPresentation(page, 2);
});

test('Skills Practiced cards show visible checkboxes in one column on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openAuthenticatedExperience(page, '/log/');
  await expectSkillCheckboxPresentation(page, 1);
});

async function renderTemplateForDriver(page, driverName) {
  await signIn(page, personas.guardianMulti);
  await selectDriverByName(page, driverName);
  return page.evaluate(async () => {
    const app = window.DV_LOG_APP;
    const cfg = window.DV_APP_CONFIG || {};
    const driverId = app?.getDriverId?.();
    const { data } = await app.client.auth.getSession();
    const response = await fetch(`${cfg.supabaseUrl.replace(/\/$/, '')}/functions/v1/driving-log-renderer`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${data.session.access_token}`,
        apikey: cfg.publishableKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ driver_id: driverId, permit_number: null })
    });
    const bytes = await response.arrayBuffer();
    return {
      status: response.status,
      template: response.headers.get('x-drive-venture-template'),
      contentType: response.headers.get('content-type'),
      bytes: bytes.byteLength
    };
  });
}

test('Michigan driver receives the Michigan driving-log template', async ({ page }) => {
  const result = await renderTemplateForDriver(page, 'Synthetic Driver One');
  expect(result.status).toBe(200);
  expect(result.template).toBe('DV-LOG-MI-v202609');
  expect(result.contentType).toContain('application/pdf');
  expect(result.bytes).toBeGreaterThan(1000);
});

test('Kansas driver receives the Drive Venture US fallback template', async ({ page }) => {
  const result = await renderTemplateForDriver(page, 'Synthetic Driver Two');
  expect(result.status).toBe(200);
  expect(result.template).toBe('DV-LOG-US-v202609');
  expect(result.contentType).toContain('application/pdf');
  expect(result.bytes).toBeGreaterThan(1000);
});
