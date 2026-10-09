import { test, expect } from '@playwright/test';

// Exercise the real page, renderer and styles with read-only API fixtures.
// No credentials, live backlog mutations or notification dispatches are needed.
const items = ['IMPLEMENTED', 'SUPERSEDED', 'CANCELLED', 'BACKLOG', 'BLOCKED']
  .flatMap((status, index) => ['P0', 'P1'].map((priority, offset) => ({
    backlog_code: `BKLG-${9000 + index * 2 + offset}`,
    title: `${status} ${priority} styling fixture`,
    category: 'Operator', status, priority,
    prevailing_status: status, prevailing_priority: priority,
    priority_score: 10, related_decision_ids: [], related_adr_ids: []
  })));

test('terminal P0/P1 rows stay green through selection while active priority and blocked styling remain intact', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', route => route.fulfill({
    contentType: 'application/javascript',
    body: `window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{access_token:'fixture-only'}}})}})};`
  }));
  await page.route('**/functions/v1/operator-backlog', async route => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
    }
    const body = route.request().postDataJSON();
    expect(['list', 'get']).toContain(body.action);
    const result = body.action === 'list'
      ? { ok: true, items }
      : { ok: true, item: items.find(item => item.backlog_code === body.backlog_code), dependencies: [], dependents: [], feedback: [], activity: [] };
    await route.fulfill({ json: result, headers: { 'access-control-allow-origin': '*' } });
  });
  await page.goto('/operator/backlog/');
  await expect(page.locator('#main')).toBeVisible();
  await expect(page.locator('.backlog-row')).toHaveCount(items.length);

  for (const item of items.filter(item => ['IMPLEMENTED', 'SUPERSEDED', 'CANCELLED'].includes(item.status))) {
    const row = page.locator(`.backlog-row[data-code="${item.backlog_code}"]`);
    await expect(row).toHaveCSS('border-left-color', 'rgb(69, 165, 101)');
    await expect(row).toHaveCSS('background-color', 'rgba(69, 165, 101, 0.22)');
    await row.click();
    await expect(page.locator('#detail-code')).toHaveText(item.backlog_code);
    await expect(row).toHaveClass(/current-active/);
    await expect(row).toHaveCSS('border-left-color', 'rgb(69, 165, 101)');
    await expect(row).toHaveCSS('background-color', 'rgba(69, 165, 101, 0.3)');
    await expect(row).toHaveCSS('box-shadow', 'rgb(247, 201, 72) 0px 0px 0px 3px inset');
    await page.locator('#filter-search').focus();
    await expect(row).toHaveCSS('border-left-color', 'rgb(69, 165, 101)');
  }
  for (const [code, color] of [['BKLG-9006', 'rgb(90, 17, 24)'], ['BKLG-9007', 'rgb(243, 196, 196)']]) {
    const row = page.locator(`.backlog-row[data-code="${code}"]`);
    await expect(row).toHaveCSS('background-color', color);
    await row.click();
    await expect(row).toHaveCSS('background-color', 'rgb(247, 201, 72)');
  }
  await expect(page.locator('.backlog-row[data-code="BKLG-9008"]')).toHaveCSS('background-color', 'rgb(49, 56, 63)');
  // Rerendering must retain terminal precedence after the priority decorator runs.
  await page.locator('#refresh').click();
  await expect(page.locator('.backlog-row[data-code="BKLG-9000"]')).toHaveCSS('border-left-color', 'rgb(69, 165, 101)');
  expect(errors).toEqual([]);
});
