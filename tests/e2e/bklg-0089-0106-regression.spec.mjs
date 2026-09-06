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

test.describe('BKLG-0089 / BKLG-0106 regression', () => {
  test('driver query parameter controls initial driver, then manual switching controls URL', async ({ page }) => {
    const assertNoPageFailures=installPageGuards(page);
    await signIn(page, personas.guardianMulti);
    const options=await page.locator('#driver-select option').evaluateAll(rows=>rows.map(r=>({id:r.value,name:r.textContent.trim()})));
    expect(options.length).toBeGreaterThanOrEqual(2);
    const target=options[1];
    await page.goto(`/log/?driver=${encodeURIComponent(target.id)}`);
    await expect(page.locator('#app-main')).toBeVisible({timeout:20_000});
    await expect(page.locator('#driver-heading')).toHaveText(target.name.replace(/ · View only$/,''),{timeout:20_000});
    await expect(page).toHaveURL(new RegExp(`driver=${target.id}`));
    const other=options[0];
    await selectDriverByName(page,other.name.replace(/ · View only$/,''));
    await expect(page).toHaveURL(new RegExp(`driver=${other.id}`));
    await selectDriverByName(page,target.name.replace(/ · View only$/,''));
    await expect(page).toHaveURL(new RegExp(`driver=${target.id}`));
    assertNoPageFailures();
  });

  test('delete removes an isolated drive immediately and it stays absent after refresh', async ({ page }, testInfo) => {
    const assertNoPageFailures=installPageGuards(page);
    await signIn(page, personas.guardianMulti);
    await selectDriverByName(page,'Synthetic Driver One');
    await waitForFormContext(page);
    const run=process.env.GITHUB_RUN_ID||Date.now(), marker=`BKLG-0106 delete ${run}-${testInfo.retry}`;
    await page.evaluate(id=>sessionStorage.setItem('dv:web-drive:submission-id',id),`bklg-0106-delete-${run}-${testInfo.retry}`);
    await page.locator('#drive-date').fill(await fixtureDate(page));
    await page.locator('#drive-start').fill('11:00');
    await page.locator('#drive-end').fill('11:10');
    await page.locator('#drive-destination').fill(marker);
    await page.locator('#drive-notes').fill('DELETE regression fixture');
    const save=page.waitForResponse(r=>r.url().includes('/functions/v1/drive-ops')&&r.request().method()==='POST'&&r.request().postData()?.includes('log_drive'),{timeout:20_000});
    await page.locator('#drive-form button[type=submit]').click();
    const saveResponse=await save; expect(saveResponse.status()).toBe(200);
    const saveBody=await saveResponse.json(); expect(saveBody.ok).toBe(true); const driveId=saveBody.drive.id;
    const row=page.locator('#drive-list .drive-item').filter({hasText:marker}).first();
    await expect(row).toBeVisible({timeout:20_000});
    await row.click();
    await expect(page.locator('.drive-detail-dialog')).toBeVisible();
    await page.locator('[data-edit-drive]').click();
    await expect(page.locator('#drive-delete')).toBeVisible();
    let dialogs=0;
    page.on('dialog',async dialog=>{dialogs+=1;if(dialog.type()==='prompt')await dialog.accept('Playwright retained-delete regression');else await dialog.accept()});
    await page.locator('#drive-delete').click();
    await expect(page.locator('#drive-status')).toHaveClass(/success/,{timeout:20_000});
    await expect(page.locator('#drive-status')).toContainText(/Drive deleted|already inactive/);
    await expect(page.locator(`#drive-list [data-drive-detail-id="${driveId}"]`)).toHaveCount(0);
    expect(dialogs).toBeGreaterThanOrEqual(2);
    await page.reload();
    await expect(page.locator('#app-main')).toBeVisible({timeout:20_000});
    await expect(page.locator(`#drive-list [data-drive-detail-id="${driveId}"]`)).toHaveCount(0);
    const canonical=await page.evaluate(async id=>{const{data,error}=await window.DV_LOG_APP.client.functions.invoke('drive-detail-api',{body:{driver_id:window.DV_LOG_APP.getDriverId(),drive_id:id}});return{status:data?.drive?.status||null,error:error?.message||null}},driveId);
    expect(canonical.status).toBe('VOID');
    assertNoPageFailures();
  });
});
