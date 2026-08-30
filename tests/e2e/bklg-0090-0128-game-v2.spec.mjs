import { test, expect } from '@playwright/test';
import { installPageGuards, personas, signIn } from './helpers.mjs';

test.describe('BKLG-0090 / BKLG-0128 Game v2 DEV preview', () => {
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
