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
  { name: 'Prior Experience', path: '/log/DV02/', route: 'dv02' },
  { name: 'Default Experience', path: '/log/', route: 'dv03' }
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

test('DV01 direct route retires to Default Experience and preserves query/hash', async ({ page }) => {
  await page.goto('/log/DV01/?driver=test#trip');
  await page.waitForURL(/\/log\/\?driver=test#trip$/);
  expect(new URL(page.url()).pathname).toBe('/log/');
});

test('Skills Practiced cards contain their checkbox and full label on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await openAuthenticatedExperience(page, '/log/');
  const cards = page.locator('.drive-skill-option');
  await expect(cards).toHaveCount(13);
  const result = await cards.evaluateAll(nodes => nodes.map(card => {
    const box = card.getBoundingClientRect();
    const input = card.querySelector('input').getBoundingClientRect();
    const label = card.querySelector('span').getBoundingClientRect();
    return {
      inputInside: input.left >= box.left && input.right <= box.right && input.top >= box.top && input.bottom <= box.bottom,
      labelInside: label.left >= box.left && label.right <= box.right + 1 && label.top >= box.top && label.bottom <= box.bottom + 1,
      overflowX: card.scrollWidth > card.clientWidth + 1
    };
  }));
  expect(result.every(x => x.inputInside && x.labelInside && !x.overflowX)).toBe(true);
  const gridColumns = await page.locator('#drive-lesson-options').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(gridColumns).toBe(2);
});

test('Skills Practiced cards collapse to one column on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openAuthenticatedExperience(page, '/log/');
  const gridColumns = await page.locator('#drive-lesson-options').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(gridColumns).toBe(1);
  const overflow = await page.locator('.drive-skill-option').evaluateAll(nodes => nodes.some(card => card.scrollWidth > card.clientWidth + 1));
  expect(overflow).toBe(false);
});
