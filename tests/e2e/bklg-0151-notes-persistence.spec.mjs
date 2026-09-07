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
  expect(body.drive?.certification_status).toBe('CERTIFIED');
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

async function saveEdit(page, expectedNotes, expectedDestination) {
  const requestPromise=page.waitForRequest(r=>r.url().includes('/functions/v1/drive-ops')&&r.method()==='POST'&&r.postData()?.includes('edit_drive'),{timeout:30_000});
  await page.locator('#drive-form button[type=submit]').click();
  const request=await requestPromise, body=request.postDataJSON();
  expect(body.notes??null).toBe(expectedNotes||null);
  if(expectedDestination!==undefined)expect(body.destination??null).toBe(expectedDestination||null);
  await expect(page.locator('#drive-status')).toContainText('Drive updated and verified',{timeout:60_000});
}

async function detail(page, driverId, driveId) {
  return page.evaluate(async ({driverId,driveId})=>{
    const {data,error}=await window.DV_LOG_APP.client.functions.invoke('drive-detail-api',{body:{driver_id:driverId,drive_id:driveId}});
    return {data,error:error?.message||null};
  },{driverId,driveId});
}

test('BKLG-0151 Road Notes persist across replace, 500-char boundary, clear, reread, and reload', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const assertNoPageFailures=installPageGuards(page);
  await signIn(page, personas.guardianMulti);
  await selectDriverByName(page,'Synthetic Driver One');
  const marker=`notes-${Date.now()}-${testInfo.retry}`;
  const driveId=await createFixture(page,marker);
  await openEdit(page,marker);
  const driverId=await page.locator('#driver-select').inputValue();

  const multiline='First line\nSecond line — authoritative note';
  await page.locator('#drive-notes').fill(multiline);
  await saveEdit(page,multiline,marker);
  let canonical=await detail(page,driverId,driveId);
  expect(canonical.error).toBeNull();
  expect(canonical.data?.drive?.notes).toBe(multiline);
  expect(canonical.data?.drive?.certification_status).toBe('CERTIFIED');
  expect(canonical.data?.drive?.certification_method).toBe('WEB_GUARDIAN_EDIT');

  const boundary='N'.repeat(500), changedDestination=`${marker}-changed`;
  await page.locator('#drive-notes').fill(boundary);
  await page.locator('#drive-destination').fill(changedDestination);
  await expect(page.locator('#drive-notes-meta')).toContainText('500 / 500');
  await saveEdit(page,boundary,changedDestination);
  canonical=await detail(page,driverId,driveId);
  expect(canonical.data?.drive?.notes).toBe(boundary);
  expect(canonical.data?.drive?.destination).toBe(changedDestination);

  await page.locator('#drive-notes').fill('');
  await saveEdit(page,null,changedDestination);
  canonical=await detail(page,driverId,driveId);
  expect(canonical.data?.drive?.notes).toBeNull();

  await page.reload();
  await expect(page.locator('#app-main')).toBeVisible({timeout:20_000});
  const afterReload=await detail(page,driverId,driveId);
  expect(afterReload.data?.drive?.notes).toBeNull();
  expect(afterReload.data?.drive?.destination).toBe(changedDestination);
  assertNoPageFailures();
});

test('BKLG-0151 Road Notes profanity is rejected without overwriting the canonical note', async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  const assertNoPageFailures=installPageGuards(page);
  await signIn(page, personas.guardianMulti);
  await selectDriverByName(page,'Synthetic Driver One');
  const marker=`profanity-${Date.now()}-${testInfo.retry}`;
  const driveId=await createFixture(page,marker);
  await openEdit(page,marker);
  const driverId=await page.locator('#driver-select').inputValue();
  await page.locator('#drive-notes').fill('sh1tty browser rejection check');
  const responsePromise=page.waitForResponse(r=>r.url().includes('/functions/v1/drive-ops')&&r.request().postData()?.includes('edit_drive'),{timeout:30_000});
  await page.locator('#drive-form button[type=submit]').click();
  const response=await responsePromise, body=await response.json();
  expect(response.status()).toBe(422);
  expect(body.code).toBe('DISALLOWED_TERM');
  expect(body.error).toBe('Not cool! Try saying that another way.');
  await expect(page.locator('#drive-status')).toContainText('Not cool! Try saying that another way.',{timeout:20_000});
  const canonical=await detail(page,driverId,driveId);
  expect(canonical.data?.drive?.notes).toBe('Initial road note');
  assertNoPageFailures();
});
