import { test, expect } from '@playwright/test';
import { installPageGuards, personas, signIn } from './helpers.mjs';

function requestAction(response) {
  try { return response.request().postDataJSON()?.action || null; } catch { return null; }
}

function waitForAction(page, slug, action, status = 200) {
  return page.waitForResponse(response =>
    response.url().includes(`/functions/v1/${slug}`) &&
    response.request().method() === 'POST' &&
    requestAction(response) === action &&
    response.status() === status,
    { timeout: 20_000 }
  );
}

async function operatorBacklogRequest(page, payload) {
  return page.evaluate(async body => {
    const cfg = window.DV_APP_CONFIG;
    const client = window.supabase.createClient(cfg.supabaseUrl, cfg.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
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

async function operatorFeedbackRequest(page, payload) {
  return page.evaluate(async body => {
    const cfg = window.DV_APP_CONFIG;
    const client = window.supabase.createClient(cfg.supabaseUrl, cfg.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    const { data: { session }, error } = await client.auth.getSession();
    if (error || !session?.access_token) return { ok: false, status: 0, error: error?.message || 'no session' };
    const response = await fetch(window.DV_OPERATOR_FEEDBACK_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body)
    });
    const result = await response.json().catch(() => ({}));
    return { ok: response.ok && result?.ok === true, status: response.status, result };
  }, payload);
}

test.describe('BKLG-0143 Operator backlog reliability', () => {
  test('standalone create, repeated search, auth retry, shared save path, out-of-band write, and terminal color work in DEV', async ({ page }, testInfo) => {
    const assertNoPageFailures = installPageGuards(page, { ignoreConsoleErrors: [/status of 401/i] });
    await signIn(page, personas.operator);
    await page.goto('/operator/backlog/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#new-item')).toBeVisible();

    const runId = process.env.GITHUB_RUN_ID || `${Date.now()}`;
    const runAttempt = process.env.GITHUB_RUN_ATTEMPT || 'local';
    const marker = `BKLG-0143 CI ${runId}-${runAttempt}-${testInfo.retry}`;

    await page.locator('#new-item').click();
    await expect(page.locator('#detail-code')).toHaveText('New backlog item');
    await page.locator('#detail-form [name="title"]').fill(marker);
    expect(await page.locator('#detail-form').evaluate(form => form.checkValidity())).toBe(false);
    await expect(page.locator('#detail-form [name="category"]')).toHaveJSProperty('required', true);
    expect(await page.locator('#detail-form [name="category"]').evaluate(input => input.validationMessage.length > 0)).toBe(true);
    await page.locator('#detail-form [name="category"]').fill('Operator / Backlog');
    expect(await page.locator('#detail-form').evaluate(form => form.checkValidity())).toBe(true);
    await page.locator('#detail-form [name="priority"]').selectOption('P1');
    await page.locator('#detail-form [name="description"]').fill('Synthetic DEV regression item for BKLG-0143.');
    await page.locator('#detail-form [name="acceptance_criteria"]').fill('Created from the top Save changes control and searchable without reload.');

    const createdResponse = waitForAction(page, 'operator-backlog', 'create');
    await page.locator('#save-item-top').click();
    const created = await (await createdResponse).json();
    expect(created?.backlog_code).toMatch(/^BKLG-\d{4,}$/);
    const code = created.backlog_code;
    await expect(page.locator('#detail-code')).toHaveText(code);

    await page.locator('#detail-form [name="notes"]').fill('Saved through the bottom control.');
    const updatedResponse = waitForAction(page, 'operator-backlog', 'update');
    await page.locator('#save-item').click();
    await updatedResponse;
    await expect(page.locator('#operator-message')).toContainText(`Saved ${code}`);

    const externalTitle = `${marker} out-of-band`;
    const external = await operatorBacklogRequest(page, {
      action: 'update',
      backlog_code: code,
      title: externalTitle
    });
    expect(external, JSON.stringify(external)).toMatchObject({ ok: true, status: 200 });

    const externalSearchResponse = waitForAction(page, 'operator-backlog', 'list');
    await page.locator('#filter-search').fill('out-of-band');
    await externalSearchResponse;
    await expect(page.locator(`#backlog-list [data-code="${code}"]`)).toContainText(externalTitle);

    let failNextList = true;
    await page.route('**/functions/v1/operator-backlog', async route => {
      let action = null;
      try { action = route.request().postDataJSON()?.action || null; } catch {}
      if (failNextList && action === 'list') {
        failNextList = false;
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, error: 'Synthetic expired operator token' })
        });
        return;
      }
      await route.continue();
    });

    const retriedSearchResponse = waitForAction(page, 'operator-backlog', 'list');
    await page.locator('#filter-search').fill(code);
    await retriedSearchResponse;
    await expect(page.locator(`#backlog-list [data-code="${code}"]`)).toBeVisible();
    expect(failNextList).toBe(false);
    await page.unroute('**/functions/v1/operator-backlog');

    const closed = await operatorBacklogRequest(page, {
      action: 'close',
      backlog_code: code,
      status: 'CANCELLED',
      outcome: 'Synthetic regression cleanup',
      notes: 'BKLG-0143 browser regression fixture cleanup.'
    });
    expect(closed, JSON.stringify(closed)).toMatchObject({ ok: true, status: 200 });

    await page.locator('#new-item').click();
    const terminalSearchResponse = waitForAction(page, 'operator-backlog', 'list');
    await page.locator('#filter-search').fill(code);
    await terminalSearchResponse;
    const terminalRow = page.locator(`#backlog-list [data-code="${code}"]`);
    await expect(terminalRow).toHaveClass(/terminal/);
    await expect(terminalRow).toHaveClass(/priority-p1/);
    const colors = await terminalRow.evaluate(element => {
      const style = getComputedStyle(element);
      return { backgroundColor: style.backgroundColor, borderLeftColor: style.borderLeftColor };
    });
    expect(colors.backgroundColor).not.toBe('rgb(90, 17, 24)');
    expect(colors.backgroundColor).not.toBe('rgb(243, 196, 196)');
    expect(colors.borderLeftColor).toBe('rgb(69, 165, 101)');

    assertNoPageFailures();
  });

  test('Feedback Create new backlog item still creates and links canonical work in DEV', async ({ page }, testInfo) => {
    const assertNoPageFailures = installPageGuards(page);
    await signIn(page, personas.operator);
    await page.goto('/operator/feedback/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 20_000 });

    const runId = process.env.GITHUB_RUN_ID || `${Date.now()}`;
    const runAttempt = process.env.GITHUB_RUN_ATTEMPT || 'local';
    const marker = `BKLG-0143 feedback CI ${runId}-${runAttempt}-${testInfo.retry}`;

    await page.locator('#operator-entry [name="name"]').fill('Synthetic Operator Regression');
    await page.locator('#operator-entry [name="source_category"]').selectOption('IDEA');
    await page.locator('#operator-entry [name="disposition_category"]').selectOption('ENHANCEMENT');
    await page.locator('#operator-entry [name="area"]').selectOption('OTHER');
    await page.locator('#operator-entry [name="message"]').fill(marker);

    const recordedResponse = waitForAction(page, 'operator-feedback', 'log_on_behalf');
    await page.locator('#operator-entry button[type="submit"]').click();
    const recorded = await (await recordedResponse).json();
    expect(recorded?.feedback_code).toMatch(/^FDBK-\d{4,}$/);
    const feedbackCode = recorded.feedback_code;

    const feedbackButton = page.locator(`#feedback-inbox [data-code="${feedbackCode}"]`);
    await expect(feedbackButton).toBeVisible({ timeout: 20_000 });
    await feedbackButton.click();
    await expect(page.locator('#selected-code')).toHaveText(feedbackCode);

    await page.locator('#link-form [name="backlog_action"]').selectOption('CREATE');
    await page.locator('#link-form [name="backlog_title"]').fill(marker);
    await page.locator('#link-form [name="backlog_category"]').fill('Operator / Backlog');
    await page.locator('#link-form [name="backlog_priority"]').selectOption('P3');
    await page.locator('#link-form [name="link_type"]').selectOption('ENHANCEMENT');
    await page.locator('#link-form [name="description"]').fill('Synthetic create-and-link regression coverage.');

    const createResponse = waitForAction(page, 'operator-backlog', 'create');
    const linkResponse = waitForAction(page, 'operator-feedback', 'link_backlog');
    await page.locator('#link-form button[type="submit"]').click();
    const created = await (await createResponse).json();
    expect(created?.backlog_code).toMatch(/^BKLG-\d{4,}$/);
    await linkResponse;

    await expect(page.locator('#selected-code')).toHaveText(feedbackCode, { timeout: 20_000 });
    await expect(page.locator('#linked-backlog-list')).toContainText(created.backlog_code, { timeout: 20_000 });

    const closed = await operatorBacklogRequest(page, {
      action: 'close',
      backlog_code: created.backlog_code,
      status: 'CANCELLED',
      outcome: 'Synthetic regression cleanup',
      notes: 'BKLG-0143 feedback regression fixture cleanup.'
    });
    expect(closed, JSON.stringify(closed)).toMatchObject({ ok: true, status: 200 });

    const disposed = await operatorFeedbackRequest(page, {
      action: 'disposition',
      feedback_code: feedbackCode,
      disposition_code: 'NO_ACTION',
      notes: 'Synthetic BKLG-0143 regression fixture cleanup.'
    });
    expect(disposed, JSON.stringify(disposed)).toMatchObject({ ok: true, status: 200 });

    assertNoPageFailures();
  });
});
