import { test, expect } from '@playwright/test';
import { fixtureDrivers, signIn, selectDriverByName } from './helpers.mjs';

async function yesterday(page) {
  return page.evaluate(() => { const d=new Date(); d.setDate(d.getDate()-1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; });
}

async function ready(page){
  await signIn(page, fixtureDrivers.boundedMichiganGuardian);
  await selectDriverByName(page,fixtureDrivers.boundedMichigan);
  const supervisor=page.locator('#drive-supervisor');
  await expect(supervisor).toBeVisible({timeout:20_000});
  await expect.poll(async()=>supervisor.locator('option').evaluateAll(options=>options.filter(option=>option.value&&option.value!=='OTHER').length),{timeout:20_000,message:'Expected at least one canonical supervisor option in DEV form context'}).toBeGreaterThan(0);
  if(!(await supervisor.inputValue())){
    await supervisor.selectOption(await supervisor.locator('option').evaluateAll(options=>options.find(option=>option.value&&option.value!=='OTHER')?.value||''));
  }
  await expect(supervisor).not.toHaveValue('');
  await expect(page.locator('#drive-form button[type=submit]')).toBeEnabled();
}

async function fillCreate(page,marker){
  await page.evaluate(id=>sessionStorage.setItem('dv:web-drive:submission-id',id),`bklg-0194-${marker}`);
  await page.locator('#drive-date').fill(await yesterday(page));
  await page.locator('#drive-start').fill('15:00');
  await page.locator('#drive-end').fill('15:12');
  await page.locator('#drive-destination').fill(marker);
  await page.locator('#drive-notes').fill('BKLG-0194 recovery canary');
}

async function createNormally(page,marker){
  await fillCreate(page,marker);
  const responsePromise=page.waitForResponse(r=>r.url().includes('/functions/v1/drive-ops')&&r.request().postData()?.includes('"operation":"CREATE"'),{timeout:30_000});
  await page.locator('#drive-form button[type=submit]').click();
  const response=await responsePromise,body=await response.json();
  expect(body.ok).toBe(true);
  await expect(page.locator('#drive-status')).toContainText('Drive logged and verified.',{timeout:60_000});
  return body.drive.id;
}

async function openEdit(page,marker){
  const row=page.locator('#drive-list .drive-item').filter({hasText:marker}).first();
  await expect(row).toBeVisible({timeout:20_000});
  await row.click();
  await expect(page.locator('.drive-detail-dialog')).toBeVisible();
  await page.locator('button[data-edit-drive]').click();
  await expect(page.locator('#drive-form')).toHaveAttribute('data-edit-drive',/.+/);
}

test('BKLG-0194 recovers a committed CREATE whose response is lost without duplicating the drive',async({page},testInfo)=>{
  test.setTimeout(180_000);
  await ready(page);
  const marker=`lost-create-${Date.now()}-${testInfo.retry}`;
  await fillCreate(page,marker);

  let intercepted=false;
  await page.route('**/functions/v1/drive-ops',async route=>{
    const request=route.request();
    if(!intercepted&&request.postData()?.includes('"operation":"CREATE"')){
      intercepted=true;
      const response=await route.fetch();
      expect(response.status()).toBe(200);
      await route.abort('failed');
      return;
    }
    await route.continue();
  });

  await page.locator('#drive-form button[type=submit]').click();
  await expect(page.locator('#drive-status')).toContainText('could not confirm whether the drive finished saving',{timeout:60_000});
  await expect(page.locator('#drive-save-recover')).toBeVisible();
  await expect(page.locator('#drive-date')).toBeDisabled();

  await page.unroute('**/functions/v1/drive-ops');
  await page.locator('#drive-save-recover').click();
  await expect(page.locator('#drive-status')).toContainText('Drive save recovered and verified',{timeout:60_000});
  await expect(page.locator('#drive-save-recover')).toBeHidden();
  await expect(page.locator('#drive-form button[type=submit]')).toBeEnabled();

  const matches=page.locator('#drive-list .drive-item').filter({hasText:marker});
  await expect(matches).toHaveCount(1,{timeout:20_000});
});

test('BKLG-0194 resolves a lost EDIT response by adopting the saved revision instead of blind retry',async({page},testInfo)=>{
  test.setTimeout(180_000);
  await ready(page);
  const marker=`lost-edit-${Date.now()}-${testInfo.retry}`;
  await createNormally(page,marker);
  await openEdit(page,marker);
  const edited=`${marker}-edited`;
  await page.locator('#drive-destination').fill(edited);

  let editCalls=0;
  await page.route('**/functions/v1/drive-ops',async route=>{
    const request=route.request();
    if(request.postData()?.includes('"operation":"EDIT"')){
      editCalls+=1;
      if(editCalls===1){
        const response=await route.fetch();
        expect(response.status()).toBe(200);
        await route.abort('failed');
        return;
      }
    }
    await route.continue();
  });

  await page.locator('#drive-form button[type=submit]').click();
  await expect(page.locator('#drive-status')).toContainText('could not confirm whether the edit finished',{timeout:60_000});
  await expect(page.locator('#drive-save-recover')).toBeVisible();
  await page.locator('#drive-save-recover').click();
  await expect(page.locator('#drive-status')).toContainText('Drive edit recovered and verified',{timeout:60_000});
  await expect(page.locator('#drive-form')).not.toHaveAttribute('data-edit-drive',/.+/);
  await expect(page.locator('#drive-destination')).toHaveValue('');
  await expect(page.locator('#drive-list .drive-item').filter({hasText:edited}).first()).toBeVisible({timeout:20_000});
  expect(editCalls).toBe(1);
  await page.unroute('**/functions/v1/drive-ops');
});


test('BKLG-0194 restores an unfinished CREATE after same-tab reload and completes the original transaction',async({page},testInfo)=>{
  test.setTimeout(180_000);
  await page.addInitScript(()=>{window.__DV_DRIVE_SAVE_TIMEOUT_MS=200});
  await ready(page);
  const marker=`reload-create-${Date.now()}-${testInfo.retry}`;
  await fillCreate(page,marker);

  let held=false;
  await page.route('**/functions/v1/drive-ops',async route=>{
    if(!held&&route.request().postData()?.includes('"operation":"CREATE"')){
      held=true;
      await new Promise(resolve=>setTimeout(resolve,1200));
      try{await route.abort('failed')}catch(_){}
      return;
    }
    await route.continue();
  });

  await page.locator('#drive-form button[type=submit]').click();
  await expect(page.locator('#drive-status')).toContainText('could not confirm whether the drive finished saving',{timeout:10_000});
  await expect(page.locator('#drive-save-recover')).toBeVisible();
  await page.unroute('**/functions/v1/drive-ops');

  await page.reload();
  await expect(page.locator('#app-main')).toBeVisible({timeout:20_000});
  await selectDriverByName(page,fixtureDrivers.boundedMichigan);
  await expect(page.locator('#drive-save-recover')).toBeVisible({timeout:20_000});
  await expect(page.locator('#drive-status')).toContainText('could not confirm whether your drive finished',{timeout:20_000});
  await page.evaluate(()=>{window.__DV_DRIVE_SAVE_TIMEOUT_MS=35_000});
  await page.locator('#drive-save-recover').click();
  await expect(page.locator('#drive-status')).toContainText('Drive save recovered and verified',{timeout:60_000});
  await expect(page.locator('#drive-list .drive-item').filter({hasText:marker})).toHaveCount(1,{timeout:20_000});
});
