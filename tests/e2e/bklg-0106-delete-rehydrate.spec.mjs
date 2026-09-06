import { test, expect } from '@playwright/test';
import { installPageGuards, personas, signIn, selectDriverByName } from './helpers.mjs';

async function waitForFormContext(page) {
  await expect(page.locator('#drive-supervisor')).toBeVisible({ timeout: 20_000 });
  await expect.poll(async () => page.locator('#drive-supervisor').inputValue(), { timeout: 20_000 }).not.toBe('');
}

async function fixtureDate(page) {
  return page.evaluate(() => {
    const d=new Date(); d.setDate(d.getDate()-1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  });
}

test('BKLG-0106 retained delete disappears immediately and stays absent after authoritative refresh', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const assertNoPageFailures=installPageGuards(page);
  await page.addInitScript(() => {
    window.confirm=()=>true;
    window.prompt=()=> 'Playwright retained-delete regression';
  });
  await signIn(page, personas.guardianMulti);
  await selectDriverByName(page,'Synthetic Driver One');
  await waitForFormContext(page);

  const run=process.env.GITHUB_RUN_ID||Date.now();
  const marker=`BKLG-0106 delete ${run}-${testInfo.retry}`;
  await page.evaluate(id=>sessionStorage.setItem('dv:web-drive:submission-id',id),`bklg-0106-delete-${run}-${testInfo.retry}`);
  await page.locator('#drive-date').fill(await fixtureDate(page));
  await page.locator('#drive-start').fill('11:00');
  await page.locator('#drive-end').fill('11:10');
  await page.locator('#drive-destination').fill(marker);
  await page.locator('#drive-notes').fill('DELETE regression fixture');

  const save=page.waitForResponse(r=>r.url().includes('/functions/v1/drive-ops')&&r.request().method()==='POST'&&r.request().postData()?.includes('log_drive'),{timeout:20_000});
  await page.locator('#drive-form button[type=submit]').click();
  const saveResponse=await save;
  expect(saveResponse.status()).toBe(200);
  const saveBody=await saveResponse.json();
  expect(saveBody.ok).toBe(true);
  const driveId=saveBody.drive.id;

  const row=page.locator('#drive-list .drive-item').filter({hasText:marker}).first();
  await expect(row).toBeVisible({timeout:20_000});
  await row.click();
  await expect(page.locator('.drive-detail-dialog')).toBeVisible();
  await page.locator('[data-edit-drive]').click();
  await expect(page.locator('#drive-delete')).toBeVisible();

  const deletedResponsePromise=page.waitForResponse(r=>r.url().includes('/functions/v1/drive-delete')&&r.request().method()==='POST',{timeout:60_000});
  await page.locator('#drive-delete').click();
  const deletedResponse=await deletedResponsePromise;
  let deletedBody=null;try{deletedBody=await deletedResponse.json()}catch{}
  expect(deletedResponse.status(),`drive-delete response: ${JSON.stringify(deletedBody)}`).toBe(200);
  expect(deletedBody?.ok,`drive-delete response: ${JSON.stringify(deletedBody)}`).toBe(true);
  expect(['DELETED','ALREADY_DELETED']).toContain(deletedBody?.outcome);
  expect(deletedBody?.drive?.status).toBe('VOID');

  await expect(page.locator(`#drive-list [data-drive-detail-id="${driveId}"]`)).toHaveCount(0,{timeout:60_000});
  await expect(page.locator('#drive-status')).toContainText(/Drive deleted|already inactive/,{timeout:60_000});

  await page.reload();
  await expect(page.locator('#app-main')).toBeVisible({timeout:20_000});
  await expect(page.locator(`#drive-list [data-drive-detail-id="${driveId}"]`)).toHaveCount(0);
  assertNoPageFailures();
});
