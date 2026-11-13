import { test, expect } from '@playwright/test';

// BKLG-0287: Browser contract against the deployed DEV preview with synthetic,
// intercepted authentication and API responses. No real account or DB writes.
const pending = {
  review_id: '00000000-0000-4000-8000-000000000287',
  driver_name: 'Synthetic Florida Learner',
  requirement_version: 'FL-2026-11-V1',
};

async function mockRegistration(page, { signedIn = true, canComplete = true } = {}) {
  const calls = [];
  let completed = false;
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2/, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:${signedIn ? "{access_token:'synthetic-browser-test-token'}" : "null"},error:null}})}})};`,
    })
  );
  await page.route('**/functions/v1/profile-api', async route => {
    const req = route.request();
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'apikey, authorization, content-type',
    };
    if (req.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    const body = req.postDataJSON();
    calls.push(body);
    let response;
    if (body.action === 'registration_reviews') {
      response = { ok: true, pending_reviews: completed ? [] : [{ ...pending, can_complete: canComplete }] };
    } else if (body.action === 'complete_registration_review') {
      if (!canComplete) {
        response = { ok: false, error: 'Unauthorized review completion' };
      } else {
        completed = true;
        response = { ok: true, result: { ok: true } };
      }
    } else {
      response = { ok: false, error: 'Unexpected test action' };
    }
    await route.fulfill({
      status: response.ok ? 200 : 403,
      contentType: 'application/json',
      headers: cors,
      body: JSON.stringify(response),
    });
  });
  return calls;
}

test('BKLG-0287 grown-up confirms a version-bound review once', async ({ page }) => {
  const calls = await mockRegistration(page);
  await page.goto('/registration-review/?review=' + pending.review_id + '&return=%2Ffamily%2F');
  await expect(page.getByRole('heading', { name: 'Florida requirements are now supported' })).toBeVisible();
  await expect(page.locator('#review-grownup')).toBeVisible();
  await expect(page.locator('#review-driver')).toBeHidden();
  await expect(page.locator('#review-driver-name')).toHaveText('Driver: Synthetic Florida Learner');

  await page.locator('#review-submit').click();
  await expect(page.locator('#review-status')).toContainText('Choose the actual license stage');
  expect(calls.filter(call => call.action === 'complete_registration_review')).toHaveLength(0);

  await page.locator('#review-license-stage').selectOption('LEARNER');
  await page.locator('#review-issue-date').fill('2025-09-01');
  await page.locator('#review-confirm').check();
  await page.locator('#review-submit').click();
  await expect(page).toHaveURL(/\/family\/$/);
  const completions = calls.filter(call => call.action === 'complete_registration_review');
  expect(completions).toHaveLength(1);
  expect(completions[0]).toEqual({
    action: 'complete_registration_review',
    review_id: pending.review_id,
    requirement_version: 'FL-2026-11-V1',
    license_stage: 'LEARNER',
    effective_date: '2025-09-01',
  });
});

test('BKLG-0287 driver sees read-only pending review and continued practice', async ({ page }) => {
  const calls = await mockRegistration(page, { canComplete: false });
  await page.goto('/registration-review/?review=' + pending.review_id);
  await expect(page.locator('#review-driver')).toBeVisible();
  await expect(page.locator('#review-grownup')).toBeHidden();
  await expect(page.getByRole('link', { name: 'Continue practice tracking' }))
    .toHaveAttribute('href', '/log/?continue_practice=1');
  expect(calls.filter(call => call.action === 'complete_registration_review')).toHaveLength(0);
});

test('BKLG-0287 signed-out visitor cannot retrieve reviews or see confirmation', async ({ page }) => {
  const calls = await mockRegistration(page, { signedIn: false });
  await page.goto('/registration-review/?review=' + pending.review_id);
  await expect(page.locator('#review-loading')).toContainText('Sign in to Drive Venture');
  await expect(page.locator('#review-grownup')).toBeHidden();
  await expect(page.locator('#review-driver')).toBeHidden();
  expect(calls).toHaveLength(0);
});

test('BKLG-0287 empty review list is a read-only completed state', async ({ page }) => {
  const calls = await mockRegistration(page);
  await page.route('**/functions/v1/profile-api', async route => {
    const req = route.request();
    if (req.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'apikey, authorization, content-type' } });
      return;
    }
    calls.push(req.postDataJSON());
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true, pending_reviews: [] }) });
  });
  await page.goto('/registration-review/');
  await expect(page.locator('#review-complete')).toBeVisible();
  await expect(page.locator('#review-grownup')).toBeHidden();
  await expect(page.getByRole('link', { name: 'Go to Family Hub' })).toHaveAttribute('href', '/family/');
});
