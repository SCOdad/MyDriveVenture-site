import { test, expect } from '@playwright/test';
import { installPageGuards, personas, signIn, selectDriverByName, currentAccessMode } from './helpers.mjs';

async function waitForDriveFormContext(page) {
  await expect(page.locator('#drive-supervisor')).toBeVisible({ timeout: 20_000 });
  await expect.poll(async () => page.locator('#drive-supervisor').inputValue(), { timeout: 20_000 }).not.toBe('');
}

async function submitDriveForm(page) {
  const responsePromise = page.waitForResponse(response => {
    if (!response.url().includes('/functions/v1/drive-ops') || response.request().method() !== 'POST') return false;
    try {
      const action = response.request().postDataJSON()?.action;
      return action === 'log_drive' || action === 'edit_drive';
    } catch {
      return false;
    }
  }, { timeout: 20_000 });
  await page.locator('#drive-form button[type=submit]').click();
  const response = await responsePromise;
  let body = null;
  try { body = await response.json(); } catch { body = null; }
  expect(response.status(), `drive-ops response: ${JSON.stringify(body)}`).toBe(200);
  expect(body?.ok, `drive-ops response: ${JSON.stringify(body)}`).toBe(true);
  return body;
}

async function expectEditRefreshComplete(page) {
  await expect(page.locator('#drive-status')).toHaveClass(/success/);
  await expect(page.locator('#drive-status')).toContainText('Drive updated and verified:');
  await expect(page.locator('#drive-edit-context')).toBeVisible();
  await expect(page.locator('#drive-form button[type=submit]')).toHaveText('Save changes');
}

test.describe('BKLG-0132 critical browser regression', () => {
  test('DEV login surface loads without JavaScript failures', async ({ page }) => {
    const assertNoPageFailures = installPageGuards(page);
    await page.goto('/log/');
    await expect(page.locator('#login-form')).toBeVisible();
    await expect(page.locator('#login-email')).toBeVisible();
    const environment = await page.evaluate(() => ({
      name: window.DV_ENVIRONMENT_CONFIG?.name || null,
      projectRef: window.DV_ENVIRONMENT_CONFIG?.projectRef || null
    }));
    expect(environment).toEqual({ name: 'dev', projectRef: 'safwylxxhywbsfxpmchd' });
    assertNoPageFailures();
  });

  test('ordinary guardian authenticates and repeatedly switches managed drivers', async ({ page }) => {
    const assertNoPageFailures = installPageGuards(page);
    await signIn(page, personas.guardianMulti);
    await expect(page.locator('#driver-select option')).toHaveCount(2);
    await selectDriverByName(page, 'Synthetic Driver One');
    await waitForDriveFormContext(page);
    expect(await currentAccessMode(page)).toBe('MANAGE');
    await expect(page.locator('#drive-form button[type=submit]')).toBeEnabled();
    await selectDriverByName(page, 'Synthetic Driver Two');
    await waitForDriveFormContext(page);
    expect(await currentAccessMode(page)).toBe('MANAGE');
    await selectDriverByName(page, 'Synthetic Driver One');
    await waitForDriveFormContext(page);
    await selectDriverByName(page, 'Synthetic Driver Two');
    await waitForDriveFormContext(page);
    await selectDriverByName(page, 'Synthetic Driver One');
    await waitForDriveFormContext(page);
    assertNoPageFailures();
  });

  test('ordinary guardian can create and edit an isolated DEV drive', async ({ page }, testInfo) => {
    const assertNoPageFailures = installPageGuards(page);
    await signIn(page, personas.guardianMulti);
    await selectDriverByName(page, 'Synthetic Driver One');
    await waitForDriveFormContext(page);
    const runId = process.env.GITHUB_RUN_ID || `${Date.now()}`;
    const runAttempt = process.env.GITHUB_RUN_ATTEMPT || 'local';
    const route = `BKLG-0132 CI Route ${runId}-${runAttempt}-${testInfo.retry}`;
    const sourceEventId = `bklg-0132-playwright-${runId}-${runAttempt}-${testInfo.retry}`;
    await page.evaluate(id => sessionStorage.setItem('dv:web-drive:submission-id', id), sourceEventId);
    await page.locator('#drive-date').fill('2026-08-29');
    await page.locator('#drive-start').fill('10:00');
    await page.locator('#drive-end').fill('10:10');
    await page.locator('#drive-destination').fill(route);
    await page.locator('#drive-notes').fill('BKLG-0132 deterministic browser fixture');
    const logged = await submitDriveForm(page);
    expect(logged?.drive?.id).toBeTruthy();
    await expect(page.locator('#drive-status')).toContainText('Drive logged and verified.');
    const row = page.locator('#drive-list .drive-item').filter({ hasText: route }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row).toHaveAttribute('data-drive-detail-id', logged.drive.id);
    await row.click();
    await expect(page.locator('.drive-detail-dialog')).toBeVisible();
    await page.locator('[data-edit-drive]').click();
    await expect(page.locator('#drive-edit-context')).toBeVisible();
    await expect(page.locator('#drive-form button[type=submit]')).toHaveText('Save changes');
    await page.locator('#drive-notes').fill('BKLG-0132 deterministic browser fixture edited');
    await expect(page.locator('#drive-notes')).toHaveValue('BKLG-0132 deterministic browser fixture edited');
    await expect(page.locator('#drive-edit-context')).toContainText('Unsaved changes: road notes');
    expect(await page.locator('#drive-form').evaluate(form => form.checkValidity())).toBe(true);
    const edited = await submitDriveForm(page);
    expect(edited?.drive?.notes).toBe('BKLG-0132 deterministic browser fixture edited');
    await expectEditRefreshComplete(page);
    await page.locator('#drive-notes').fill('BKLG-0132 deterministic browser fixture');
    await expect(page.locator('#drive-edit-context')).toContainText('Unsaved changes: road notes');
    const restored = await submitDriveForm(page);
    expect(restored?.drive?.notes).toBe('BKLG-0132 deterministic browser fixture');
    await expectEditRefreshComplete(page);
    assertNoPageFailures();
  });

  test('Michigan skills use compact checkboxes, persist edits, and appear in trip detail', async ({ page }, testInfo) => {
    const assertNoPageFailures = installPageGuards(page);
    await signIn(page, personas.guardianMulti);
    await selectDriverByName(page, 'Synthetic Driver One');
    await waitForDriveFormContext(page);
    const skills=page.locator('#drive-lesson-options input[type=checkbox]');
    await expect(skills).toHaveCount(13, { timeout: 20_000 });
    await expect(page.locator('#drive-lesson')).toBeHidden();
    await skills.nth(0).check();
    await skills.nth(7).check();
    expect(await page.evaluate(() => window.DV_DRIVING_LOG.getSelectedLessonIds())).toHaveLength(2);
    const runId=process.env.GITHUB_RUN_ID||`${Date.now()}`,route=`BKLG-0151 skills ${runId}-${testInfo.retry}`;
    await page.evaluate(id=>sessionStorage.setItem('dv:web-drive:submission-id',id),`bklg-0151-skills-${runId}-${testInfo.retry}`);
    await page.locator('#drive-date').fill('2026-08-29');
    await page.locator('#drive-start').fill('14:00');
    await page.locator('#drive-end').fill('14:15');
    await page.locator('#drive-destination').fill(route);
    await page.locator('#drive-notes').fill('Skills detail fixture');
    const skillResponsePromise=page.waitForResponse(r=>r.url().includes('/functions/v1/drive-skill-ops')&&r.request().method()==='POST',{timeout:20_000});
    const logged=await submitDriveForm(page);
    const skillResponse=await skillResponsePromise;
    const skillRequest=skillResponse.request().postDataJSON();
    let skillBody=null;try{skillBody=await skillResponse.json()}catch{}
    expect(skillRequest.lesson_ids,`drive-skill-ops request: ${JSON.stringify(skillRequest)}`).toHaveLength(2);
    expect(skillResponse.status(),`drive-skill-ops response: ${JSON.stringify(skillBody)}`).toBe(200);
    expect(skillBody?.ok,`drive-skill-ops response: ${JSON.stringify(skillBody)}`).toBe(true);
    const immediateDetail=await page.evaluate(async id=>{const{data,error}=await window.DV_LOG_APP.client.functions.invoke('drive-detail-api',{body:{driver_id:window.DV_LOG_APP.getDriverId(),drive_id:id}});return{data,error:error?.message||null}},logged.drive.id);
    expect(immediateDetail.error).toBeNull();
    expect(immediateDetail.data.lesson_ids).toHaveLength(2);
    expect(immediateDetail.data.lessons.map(x=>x.lesson_code)).toEqual(['1','8']);
    const row=page.locator('#drive-list .drive-item').filter({hasText:route}).first();await expect(row).toBeVisible({timeout:20_000});await row.click();
    await expect(page.locator('.drive-detail-dialog')).toContainText('Supervisor');
    await expect(page.locator('.drive-detail-dialog')).toContainText('Skills Practiced');
    await expect(page.locator('.drive-detail-dialog')).toContainText('1 · Before you start the engine');
    await expect(page.locator('.drive-detail-dialog')).toContainText('8 · Parking');
    await page.locator('[data-edit-drive]').click();
    await expect(page.locator('#drive-lesson-options input:checked')).toHaveCount(2);
    await skills.nth(11).check();
    const longNote='N'.repeat(500);await page.locator('#drive-notes').fill(longNote);
    await expect(page.locator('#drive-notes-meta')).toContainText('500 / 500 · maximum reached');
    await submitDriveForm(page);await expectEditRefreshComplete(page);
    await expect(page.locator('#drive-lesson-options input:checked')).toHaveCount(3);
    await expect(page.locator('#drive-notes')).toHaveValue(longNote);
    const detail=await page.evaluate(async id=>{const{data,error}=await window.DV_LOG_APP.client.functions.invoke('drive-detail-api',{body:{driver_id:window.DV_LOG_APP.getDriverId(),drive_id:id}});return{data,error:error?.message||null}},logged.drive.id);
    expect(detail.error).toBeNull();expect(detail.data.lesson_ids).toHaveLength(3);expect(detail.data.drive.notes).toHaveLength(500);expect(detail.data.supervisor?.display_name).toBeTruthy();
    assertNoPageFailures();
  });

  test('operator authenticates, sees VIEW-only drivers, and gets bounded admin edit controls', async ({ page }) => {
    const assertNoPageFailures = installPageGuards(page);
    await signIn(page, personas.operator);
    await expect(page.locator('#operator-driver-search')).toBeVisible({ timeout: 20_000 });
    await selectDriverByName(page, 'Synthetic Driver One');
    expect(await currentAccessMode(page)).toBe('VIEW');
    await selectDriverByName(page, 'Synthetic Driver Two');
    expect(await currentAccessMode(page)).toBe('VIEW');
    await selectDriverByName(page, 'Synthetic Driver One');
    const firstDrive = page.locator('#drive-list [data-drive-detail-id]').first();
    await expect(firstDrive).toBeVisible({ timeout: 20_000 });
    await firstDrive.click();
    await expect(page.getByRole('button', { name: 'Admin edit this drive' })).toBeVisible();
    await page.getByRole('button', { name: 'Admin edit this drive' }).click();
    await expect(page.locator('#drive-admin-reason-wrap')).toBeVisible();
    await expect(page.locator('#drive-admin-reason')).toHaveJSProperty('required', true);
    assertNoPageFailures();
  });

  test('administrator content and skill edits never certify a drive', async ({ page }) => {
    const assertNoPageFailures=installPageGuards(page);
    await signIn(page,personas.operator);await selectDriverByName(page,'Synthetic Driver One');
    const result=await page.evaluate(async()=>{
      const app=window.DV_LOG_APP,driverId=app.getDriverId(),ids=(app.getModel()?.recent_drives||[]).filter(d=>d.driver_id===driverId).map(d=>d.id);
      let detail=null;
      for(const id of ids){const r=await app.client.functions.invoke('drive-detail-api',{body:{driver_id:driverId,drive_id:id}});if(r.data?.drive?.certification_status==='CERTIFIED'){detail=r.data;break}}
      if(!detail)return{error:'No certified synthetic drive available'};
      const cfg=window.DV_APP_CONFIG,{data:sessionData}=await app.client.auth.getSession(),token=sessionData?.session?.access_token;
      const direct=async(slug,body)=>{const r=await fetch(`${cfg.supabaseUrl.replace(/\/$/,'')}/functions/v1/${slug}`,{method:'POST',headers:{authorization:`Bearer ${token}`,apikey:cfg.publishableKey,'content-type':'application/json'},body:JSON.stringify(body)});return{status:r.status,body:await r.json()}};
      const d=detail.drive,stamp=Date.now(),edit=await direct('drive-ops',{action:'edit_drive',driver_id:driverId,drive_id:d.id,drive_date:d.drive_date,start_time:d.start_time,end_time:d.end_time,vehicle_id:d.vehicle_id,lesson_id:d.lesson_id,lesson_notes:d.lesson_notes,supervisor_person_id:d.supervisor_person_id,external_supervisor_name:d.external_supervisor_name,destination:d.destination,notes:`Operator UAT ${stamp}`,reason:`BKLG-0151 admin certification regression ${stamp}`});
      const afterEdit=(await app.client.functions.invoke('drive-detail-api',{body:{driver_id:driverId,drive_id:d.id}})).data;
      const currentIds=afterEdit.lesson_ids||[],all=(await app.client.functions.invoke('drive-ops',{body:{action:'form_context',driver_id:driverId}})).data?.lessons||[],alternate=currentIds.length>1?[currentIds[0]]:[currentIds[0]||all[0]?.id,all.find(x=>x.id!==(currentIds[0]||all[0]?.id))?.id].filter(Boolean);
      const skill=await direct('drive-skill-ops',{action:'set',driver_id:driverId,drive_id:d.id,lesson_ids:alternate,reason:`BKLG-0151 operator skill regression ${stamp}`});
      const afterSkill=(await app.client.functions.invoke('drive-detail-api',{body:{driver_id:driverId,drive_id:d.id}})).data;
      return{edit,afterEdit:afterEdit?.drive,skill,afterSkill:afterSkill?.drive,lessonIds:afterSkill?.lesson_ids};
    });
    expect(result.error).toBeUndefined();expect(result.edit.status).toBe(200);expect(result.edit.body.ok).toBe(true);
    expect(result.afterEdit.certification_status).toBe('PENDING');expect(result.afterEdit.certified_by_person_id).toBeNull();expect(result.afterEdit.certification_method).toBeNull();
    expect(result.skill.status).toBe(200);expect(result.skill.body.ok).toBe(true);expect(result.afterSkill.certification_status).toBe('PENDING');expect(result.afterSkill.certified_by_person_id).toBeNull();expect(result.afterSkill.certification_method).toBeNull();expect(result.lessonIds.length).toBeGreaterThan(0);
    assertNoPageFailures();
  });
});