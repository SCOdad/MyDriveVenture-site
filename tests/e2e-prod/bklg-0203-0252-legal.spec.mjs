import { test, expect } from '@playwright/test';

// BKLG-0203 + BKLG-0252: the Pages deployment, not a PR, must serve the approved policy version.
// This stays isolated from the older BKLG-0128 DV03 production-cockpit checks.
test('production serves the October 16 Terms and Privacy versions', async ({ page }) => {
  await page.goto(`/terms/?policycheck=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main[data-policy-version="terms-2026-10-16"]')).toBeVisible();
  await expect(page.locator('main h1')).toHaveText('Terms & Conditions');
  const terms = await page.locator('main').innerText();
  expect(terms).toContain('$24.99 USD one-time Family License');
  expect(terms).toContain('$9.99 USD');
  expect(terms).toContain('within seven days of that specific purchase');
  expect(terms).toContain('the Family has logged no more than 20 total hours');
  expect(terms).toContain('the specific driver receiving that additional seat');
  expect(terms).toContain('other drivers\' hours do not count');
  expect(terms).toContain('drives later deleted');
  expect(terms).not.toContain('proposed beta policy');
  await expect(page.locator('main a[href^="mailto:"]')).toHaveCount(0);

  await page.goto(`/privacy/?policycheck=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main[data-policy-version="privacy-2026-10-16"]')).toBeVisible();
  await expect(page.locator('main h1')).toHaveText('Privacy Policy');
  const privacy = await page.locator('main').innerText();
  expect(privacy).toContain('How payments and billing work');
  expect(privacy).toContain('Inactive pilot registration and driving records are deleted or de-identified within 12 months');
  await expect(page.locator('main a[href^="mailto:"]')).toHaveCount(0);
});

test('production Feedback offers Privacy and Billing intake and no personal footer email', async ({ page }) => {
  await page.goto(`/feedback/?policycheck=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  const options = page.locator('select[name="category"] option');
  await expect(options.filter({ hasText: 'Privacy question or data request' })).toHaveCount(1);
  await expect(options.filter({ hasText: 'Billing, purchase, or refund question' })).toHaveCount(1);
  await expect(page.locator('footer a[href^="mailto:"]')).toHaveCount(0);
});
