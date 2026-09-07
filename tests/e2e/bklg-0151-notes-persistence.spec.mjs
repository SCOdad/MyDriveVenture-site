import { test, expect } from '@playwright/test';
import { installPageGuards, personas, signIn, selectDriverByName } from './helpers.mjs';

async function yesterday(page) {
  return page.evaluate(() => { const d=new Date(); d.setDate(d.getDate()-1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; });
}

async function createFixture(page, marker) {
  await page.evaluate(id=>sessionStorage.setItem('dv:web-drive:submission-id',id),`bklg-0151-notes-${marker}`);
  await page.locator('#drive-date').fill(await yesterday(page));
  await page.locator('#drive-start').fill('12:00');
  await page.locator('#drive-end').fill('12:10');
  await page.locator('#drive-destination').fill(marker);
  await page.locator('#drive-notes').fill('Initial road note');
  const responsePromise=page.waitForResponse(r=>r.url().includes('/functions/v1/drive-ops')&&r.request().postData()?.includes('log_drive'),{timeout:30_000});
  await page.locator('#drive-form button[type=submit]').click();
  const response=await responsePromise;
  const body=await response.json();
  expect(body.ok).toBe(true);
  return body.drive.id;
}

async function openEdit(page, marker) {
  const row=page.locator('#drive-list .drive-item').filter({hasText:marker}).first();
  await expect(row).toBeVisible({timeout:20_000});
  await row.click();
  await expect(page.locator('.drive-detail-dialog')).toBeVisible();
  await page.locator('[data-edit-drive]').click();
  await expect(page.locator('#drive-form')).toHaveAttribute('data-edit-drive',/.+/);
}

test('BKLG-0151 road notes persist through edit, authoritative reread, and reload', async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  const assertNoPageFailures=installPageGuards(page);
  await signIn(page, personas.guardianMulti);
  await selectDriverByName(page,'Synthetic Driver One');
  const marker=`notes-${Date.now()}-${testInfo.retry}`;
  const driveId=await createFixture(page,marker);
  await openEdit(page,marker);

  const note='First line\nSecond line — authoritative note';
  await page.locator('#drive-notes').fill(note);
  const editRequest=page.waitForRequest(r=>r.url().includes('/functions/v1/drive-ops')&&r.method()==='POST'&&r.postData()?.includes('edit_drive'),{timeout:30_000});
  await page.locator('#drive-form button[type=submit]').click();
  const request=await editRequest;
  expect(request.postDataJSON().notes).toBe(note);
  await expect(page.locator('#drive-status')).toContainText('Drive updated and verified',{timeout:60_000});
  await expect(page.locator('#drive-notes')).toHaveValue(note);

  const driverId=await page.locator('#driver-select').inputValue();
  const detail=await page.evaluate(async ({driverId,driveId})=>{
    const {data,error}=await window.DV_LOG_APP.client.functions.invoke('drive-detail-api',{body:{driver_id:driverId,drive_id:driveId}});
    return {data,error:error?.message||null};
  },{driverId,driveId});
  expect(detail.error).toBeNull();
  expect(detail.data?.drive?.notes).toBe(note);

  await page.reload();
  await expect(page.locator('#app-main')).toBeVisible({timeout:20_000});
  const afterReload=await page.evaluate(async ({driverId,driveId})=>{
    const {data}=await window.DV_LOG_APP.client.functions.invoke('drive-detail-api',{body:{driver_id:driverId,drive_id:driveId}});
    return data?.drive?.notes??null;
  },{driverId,driveId});
  expect(afterReload).toBe(note);
  assertNoPageFailures();
});
