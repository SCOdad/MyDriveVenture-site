import { test, expect } from '@playwright/test';
import { installPageGuards, personas, signIn, selectDriverByName } from './helpers.mjs';

test.describe('BKLG-0090 / BKLG-0128 Game v2 DEV preview', () => {
  test('unauthenticated mock preview uses synthetic read-only data without backend calls', async ({ page }) => {
    const backendCalls=[];
    page.on('request',request=>{
      const url=request.url();
      if(url.includes('safwylxxhywbsfxpmchd.supabase.co') && (/\/rest\/v1\//.test(url)||/\/functions\/v1\//.test(url)||/\/rpc\//.test(url))) backendCalls.push(url);
    });

    await page.goto('/log/game-v2/');
    await expect(page.locator('#app-login')).toBeVisible();
    await expect(page.locator('#dv-mock-preview')).toBeVisible();
    backendCalls.length=0;

    await page.locator('#dv-mock-preview').click();
    await expect(page.locator('#app-main')).toBeVisible();
    await expect(page.locator('#dv-mock-banner')).toBeVisible();
    await expect(page.locator('#driver-heading')).toContainText('Riley Roadster');
    await expect(page.locator('body')).toHaveAttribute('data-dv-driver-color','teal');
    await expect(page.locator('#dv-palette-preview')).toBeVisible();
    await expect(page.locator('#drive-form button[type="submit"]')).toBeDisabled();
    await expect(page.locator('#vehicle-form button[type="submit"]')).toBeDisabled();
    await expect(page.locator('#drive-form .dv-mock-form-note')).toContainText('saving is disabled');

    const gear=page.getByRole('button',{name:'Color palette settings'});
    await gear.click();
    await expect(page.locator('#dv-driver-palette')).toBeVisible();
    await expect(page.locator('#dv-driver-palette [data-dv-palette-id]')).toHaveCount(12);
    await expect(page.locator('#dv-driver-palette').getByRole('button',{name:/^Red palette swatch/})).toBeVisible();
    await page.locator('#dv-driver-palette [data-dv-palette-id="PURPLE"]').click();
    await expect(page.locator('body')).toHaveAttribute('data-dv-driver-color','purple');
    await expect(page.locator('#dv-palette-status')).toContainText('not saved');
    await page.getByRole('button',{name:'Close color palette'}).click();
    await expect(page.locator('#dv-driver-palette')).toBeHidden();
    await gear.click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#dv-driver-palette')).toBeHidden();

    await page.locator('#dv-palette-preview [data-dv-scene-preview="PARK"]').click();
    await expect(page.locator('#dv-scene-layer')).toHaveAttribute('data-dv-scene','park');
    await page.locator('#dv-palette-preview [data-dv-scene-preview="CONSTRUCTION"]').click();
    await expect(page.locator('#dv-scene-layer')).toHaveAttribute('data-dv-scene','construction');

    await page.waitForTimeout(300);
    expect(backendCalls).toEqual([]);
  });
  test('operator can preview every driver palette inside the v2 windshield without persisting it', async ({ page }) => {
    const assertNoPageFailures=installPageGuards(page);
    await signIn(page,personas.operator);
    await page.goto('/log/game-v2/');
    await expect(page.locator('#app-main')).toBeVisible({timeout:20_000});
    await expect(page.locator('#dv-palette-preview')).toBeVisible({timeout:20_000});
    await expect(page.locator('#dv-palette-preview [data-dv-palette-id]')).toHaveCount(12);

    const before=await page.evaluate(()=>document.body.dataset.dvDriverColor||null);
    await page.locator('#dv-palette-preview [data-dv-palette-id="PURPLE"]').click();
    await expect(page.locator('body')).toHaveAttribute('data-dv-driver-color','purple');
    await expect(page.locator('#dv-palette-preview [data-dv-palette-id="PURPLE"]')).toHaveAttribute('aria-pressed','true');

    await page.locator('#dv-palette-preview [data-dv-palette-auto]').click();
    const after=await page.evaluate(()=>document.body.dataset.dvDriverColor||null);
    expect(after).toBeTruthy();
    expect(await page.evaluate(()=>window.DV_GAME_V2?.getPaletteOverride?.())).toBeNull();

    await page.locator('#dv-palette-preview [data-dv-scene-preview="PARK"]').click();
    await expect(page.locator('#dv-scene-layer')).toHaveAttribute('data-dv-scene','park');
    await page.locator('#dv-palette-preview [data-dv-scene-preview="CONSTRUCTION"]').click();
    await expect(page.locator('#dv-scene-layer')).toHaveAttribute('data-dv-scene','construction');
    await page.locator('#dv-palette-preview [data-dv-scene-preview="AUTO"]').click();
    expect(await page.evaluate(()=>window.DV_GAME_V2?.getSceneOverride?.())).toBeNull();

    expect(before).toBeTruthy();
    assertNoPageFailures();
  });

  test('ordinary family access never sees the DEV operator palette harness', async ({ page }) => {
    const assertNoPageFailures=installPageGuards(page);
    await signIn(page,personas.guardianMulti);
    await page.goto('/log/game-v2/');
    await expect(page.locator('#app-main')).toBeVisible({timeout:20_000});
    await expect(page.locator('#dv-palette-preview')).toBeHidden();
    assertNoPageFailures();
  });

  test('favorite color can be changed in Profile and is reflected by Game v2, then restored', async ({ page }) => {
    const assertNoPageFailures=installPageGuards(page);
    await signIn(page,personas.guardianMulti);

    await page.goto('/profile/');
    await expect(page.locator('#profile-app')).toBeVisible({timeout:20_000});
    const option=page.locator('#profile-subject option').filter({hasText:'Synthetic Driver One'}).first();
    const personId=await option.getAttribute('value');
    expect(personId).toBeTruthy();
    await page.locator('#profile-subject').selectOption(personId);
    await expect(page.locator('#profile-color-wrap')).toBeVisible();

    const saveResponse=page.waitForResponse(response=>response.url().includes('/functions/v1/profile-api')&&response.request().method()==='POST'&&response.status()===200);
    await page.locator('#profile-color-wrap [data-dv-palette-id="GREEN"]').click();
    await page.locator('#profile-form button[type="submit"]').click();
    await saveResponse;
    await expect(page.locator('#profile-status')).toContainText('Profile saved');

    await page.goto('/log/game-v2/');
    await expect(page.locator('#app-main')).toBeVisible({timeout:20_000});
    await selectDriverByName(page,'Synthetic Driver One');
    await expect(page.locator('body')).toHaveAttribute('data-dv-driver-color','green');

    await page.getByRole('button',{name:'Color palette settings'}).click();
    const consoleSave=page.waitForResponse(response=>response.url().includes('/functions/v1/profile-api')&&response.request().method()==='POST'&&response.status()===200);
    await page.locator('#dv-driver-palette [data-dv-palette-id="PURPLE"]').click();
    await consoleSave;
    await expect(page.locator('body')).toHaveAttribute('data-dv-driver-color','purple');
    await expect(page.locator('#dv-palette-status')).toContainText('Purple saved');

    await page.goto('/profile/');
    await expect(page.locator('#profile-app')).toBeVisible({timeout:20_000});
    await page.locator('#profile-subject').selectOption(personId);
    await expect(page.locator('#profile-color-wrap')).toBeVisible();
    const restoreResponse=page.waitForResponse(response=>response.url().includes('/functions/v1/profile-api')&&response.request().method()==='POST'&&response.status()===200);
    await page.locator('#profile-color-wrap [data-dv-palette-clear]').click();
    await page.locator('#profile-form button[type="submit"]').click();
    await restoreResponse;
    await expect(page.locator('#profile-status')).toContainText('Profile saved');
    assertNoPageFailures();
  });

  test('Game v2 exposes the isolated scenery registry while Game v1 remains the default console', async ({ page }) => {
    await page.goto('/log/game-v2/');
    await expect(page.locator('.experience-bar')).toContainText('DV-02 / DRIVER CONSOLE V2 · DEV');
    const rules=await page.evaluate(()=>window.DV_GAME_V2?.sceneRules||null);
    expect(rules).toEqual({Q000035:'PARK',Q000012:'CONSTRUCTION'});

    await page.goto('/log/game/');
    await expect(page.locator('.experience-bar')).toContainText('DV-01 / DRIVER CONSOLE');
    await expect(page.locator('#dv-palette-preview')).toHaveCount(0);
  });
});
