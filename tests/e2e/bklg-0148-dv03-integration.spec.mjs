import {test,expect} from '@playwright/test';

test('DV03 mock preview uses Parker fallback and remains read-only',async({page})=>{
  await page.goto('/log/game/DV03/');
  await expect(page.locator('.experience-bar')).toContainText('DV02 remains default');
  await page.getByRole('button',{name:'Preview DV03 with synthetic data'}).click();
  await expect(page.getByRole('heading',{name:'Synthetic Driver'})).toBeVisible();
  const hero=page.locator('#dv03-hero');
  await expect(hero).toHaveAttribute('data-dv-hero-source','parker');
  await expect(hero).toHaveAttribute('src','/assets/images/dv03/hero/parker-seated.png');
  await expect(page.locator('#drive-form button[type="submit"]')).toBeDisabled();
  await expect(page.locator('#vehicle-form button[type="submit"]')).toBeDisabled();
  await expect(page.locator('.dv03-cockpit-frame')).toBeVisible();
  await expect(page.locator('#dash-clock')).toHaveText('5:42 PM');
  await expect(page.locator('#night-xp-start')).toHaveText('9:12 PM');
  await expect(page.locator('#night-xp-end')).toHaveText('5:55 AM');
});

test('DV03 remains coherent at the mobile breakpoint',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/log/game/DV03/');
  await page.getByRole('button',{name:'Preview DV03 with synthetic data'}).click();
  await expect(page.locator('#dv03-hero')).toBeVisible();
  await expect(page.locator('.hours-sign')).toBeVisible();
  await expect(page.locator('.dv03-cockpit-frame')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
});

test('DV02 remains the default game route',async({page})=>{
  await page.goto('/log/');
  await expect(page).toHaveURL(/\/log\/game\/$/);
  await expect(page.getByText('DV-02 / DRIVER CONSOLE')).toBeVisible();
});
