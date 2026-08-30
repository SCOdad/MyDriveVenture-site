import { test, expect } from '@playwright/test';
import { personas, signIn } from './helpers.mjs';

function requestAction(response) {
  try { return response.request().postDataJSON()?.action || null; } catch { return null; }
}

function waitForAction(page, action, status = 200) {
  return page.waitForResponse(response =>
    response.url().includes('/functions/v1/operator-backlog') &&
    response.request().method() === 'POST' &&
    requestAction(response) === action &&
    response.status() === status,
    { timeout: 20_000 }
  );
}

async function backlogRequest(page, payload) {
  return page.evaluate(async body => {
    const cfg = window.DV_APP_CONFIG;
    const client = window.supabase.createClient(cfg.supabaseUrl, cfg.publishableKey, { auth: { persistSession: true, autoRefreshToken: true } });
    const { data: { session }, error } = await client.auth.getSession();
    if (error || !session?.access_token) return { ok: false, status: 0, error: error?.message || 'no session' };
    const response = await fetch(window.DV_OPERATOR_BACKLOG_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body)
    });
    const result = await response.json().catch(() => ({}));
    return { ok: response.ok && result?.ok === true, status: response.status, result };
  }, payload);
}

test.describe('BKLG-0143 focused Operator backlog regression', () => {
  test('required fields, canonical Category, both Save controls, and terminal precedence work in DEV', async ({ page }, testInfo) => {
    await signIn(page, personas.operator);
    await page.goto('/operator/backlog/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 20_000 });

    const runId = process.env.GITHUB_RUN_ID || `${Date.now()}`;
    const marker = `BKLG-0143 focused CI ${runId}-${testInfo.retry}`;

    await page.locator('#new-item').click();
    await expect(page.locator('#detail-code')).toHaveText('New backlog item');
    await expect(page.locator('#save-item-top')).toBeVisible();
    await expect(page.locator('#save-item')).toBeVisible();

    const category = page.locator('#detail-form [name="category"]');
    await expect(category).toHaveJSProperty('required', true);
    await expect(category.locator('option')).toHaveCount(12);
    await expect(category.locator('option')).toHaveText([
      'Choose category', 'Product', 'Web / UX', 'Visual / Brand', 'Quest Engine', 'Data',
      'Platform / Infrastructure', 'Technical Debt', 'Operations', 'Operator',
      'Communications / Text Parker', 'Documentation'
    ]);

    await page.locator('#detail-form [name="title"]').fill(marker);
    expect(await page.locator('#detail-form').evaluate(form => form.checkValidity())).toBe(false);
    expect(await category.evaluate(input => input.validationMessage.length > 0)).toBe(true);

    await category.selectOption('Operator');
    await page.locator('#detail-form [name="priority"]').selectOption('P1');
    expect(await page.locator('#detail-form').evaluate(form => form.checkValidity())).toBe(true);

    const createdResponse = waitForAction(page, 'create');
    await page.locator('#save-item-top').click();
    const created = await (await createdResponse).json();
    expect(created?.backlog_code).toMatch(/^BKLG-\d{4,}$/);
    const code = created.backlog_code;
    await expect(page.locator('#detail-code')).toHaveText(code);

    await page.locator('#detail-form [name="notes"]').fill('Saved through the bottom control.');
    const updatedResponse = waitForAction(page, 'update');
    await page.locator('#save-item').click();
    await updatedResponse;
    await expect(page.locator('#operator-message')).toContainText(`Saved ${code}`);

    const closed = await backlogRequest(page, {
      action: 'close', backlog_code: code, status: 'CANCELLED',
      outcome: 'Synthetic regression cleanup', notes: 'BKLG-0143 focused browser fixture cleanup.'
    });
    expect(closed, JSON.stringify(closed)).toMatchObject({ ok: true, status: 200 });

    const listResponse = waitForAction(page, 'list');
    await page.locator('#filter-search').fill(code);
    await listResponse;
    const row = page.locator(`#backlog-list [data-code="${code}"]`);
    await expect(row).toHaveClass(/terminal/);
    await expect(row).toHaveClass(/priority-p1/);
    const colors = await row.evaluate(element => {
      const style = getComputedStyle(element);
      return { backgroundColor: style.backgroundColor, borderLeftColor: style.borderLeftColor };
    });
    expect(colors.backgroundColor).not.toBe('rgb(90, 17, 24)');
    expect(colors.backgroundColor).not.toBe('rgb(243, 196, 196)');
    expect(colors.borderLeftColor).toBe('rgb(69, 165, 101)');
  });

  test('historical Category survives unrelated edits and a stale-token response is refreshed once', async ({ page }, testInfo) => {
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await signIn(page, personas.operator);
    await page.goto('/operator/backlog/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 20_000 });

    const runId = process.env.GITHUB_RUN_ID || `${Date.now()}`;
    const marker = `BKLG-0143 historical CI ${runId}-${testInfo.retry}`;
    const created = await backlogRequest(page, {
      action: 'create', title: marker, category: 'Legacy Regression Category', status: 'BACKLOG', priority: 'P3'
    });
    expect(created, JSON.stringify(created)).toMatchObject({ ok: true, status: 200 });
    const code = created.result.backlog_code;

    await page.goto(`/operator/backlog/?bklg=${encodeURIComponent(code)}`);
    await expect(page.locator('#detail-code')).toHaveText(code, { timeout: 20_000 });
    const category = page.locator('#detail-form [name="category"]');
    await expect(category).toHaveValue('Legacy Regression Category');
    await expect(category.locator('option:checked')).toHaveText('Legacy Regression Category (historical)');

    await page.locator('#detail-form [name="notes"]').fill('Unrelated edit preserving historical Category.');
    const updateResponse = waitForAction(page, 'update');
    await page.locator('#save-item-top').click();
    await updateResponse;
    const fetched = await backlogRequest(page, { action: 'get', backlog_code: code });
    expect(fetched.result?.item?.category).toBe('Legacy Regression Category');

    let failNextList = true;
    await page.route('**/functions/v1/operator-backlog', async route => {
      let action = null;
      try { action = route.request().postDataJSON()?.action || null; } catch {}
      if (failNextList && action === 'list') {
        failNextList = false;
        await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'Authentication required' }) });
        return;
      }
      await route.continue();
    });

    const retryResponse = waitForAction(page, 'list');
    await page.locator('#filter-search').fill(code);
    await retryResponse;
    await expect(page.locator(`#backlog-list [data-code="${code}"]`)).toBeVisible();
    expect(failNextList).toBe(false);
    await page.unroute('**/functions/v1/operator-backlog');

    const closed = await backlogRequest(page, {
      action: 'close', backlog_code: code, status: 'CANCELLED',
      outcome: 'Synthetic regression cleanup', notes: 'BKLG-0143 historical-category fixture cleanup.'
    });
    expect(closed, JSON.stringify(closed)).toMatchObject({ ok: true, status: 200 });
    expect(pageErrors).toEqual([]);
  });
});
