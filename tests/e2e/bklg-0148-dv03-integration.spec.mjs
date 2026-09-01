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
  await expect(page.locator('#night-time-phase')).toHaveText('BEGINS');
  await expect(page.locator('#night-time-value')).toHaveText('9:12 PM');
  const layout=await page.evaluate(()=>{const sign=document.querySelector('.hours-sign').getBoundingClientRect(),frame=document.querySelector('.dv03-cockpit-frame-layer'),meta=document.querySelector('.dash-status-meta').getBoundingClientRect(),status=document.querySelector('.dash-status').getBoundingClientRect();return{signRight:sign.right,signWidth:sign.width,signBackground:getComputedStyle(document.querySelector('.hours-sign')).backgroundColor,signZ:Number(getComputedStyle(document.querySelector('.dv03-sign-layer')).zIndex),frameZ:Number(getComputedStyle(frame).zIndex),metaRight:meta.right,statusRight:status.right}});
  expect(layout.signWidth).toBeGreaterThan(250);
  expect(layout.signRight).toBeGreaterThan(850);
  expect(layout.signBackground).not.toBe('rgba(0, 0, 0, 0)');
  expect(layout.signZ).toBeLessThan(layout.frameZ);
  expect(Math.abs(layout.statusRight-layout.metaRight)).toBeLessThan(20);
  const colors=await page.evaluate(()=>({local:getComputedStyle(document.querySelector('.local-time-status')).color,localValue:getComputedStyle(document.querySelector('#dash-clock')).color,night:getComputedStyle(document.querySelector('#night-time-value')).color,driver:getComputedStyle(document.body).getPropertyValue('--dv-driver-highlight').trim()}));
  expect(colors.local).toBe(colors.localValue);
  expect(colors.local).not.toBe(colors.night);
  expect(colors.driver).not.toBe('');
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
