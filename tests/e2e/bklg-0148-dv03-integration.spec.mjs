import {test,expect} from '@playwright/test';

test('DV03 mock preview uses Parker fallback and remains read-only',async({page})=>{
  await page.goto('/log/');
  await expect(page.locator('.experience-bar')).toContainText('Current Experience');
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
  const milestone=page.locator('.dv03-milestone-strip .hours-sign');
  await expect(milestone).toBeVisible();
  await expect(milestone).toContainText('NEXT LICENSE MILESTONE');
  await expect(milestone.locator('#hours-sign')).not.toHaveText(/Loading/i);
  await expect(milestone.locator('#hours-sign')).toHaveText(/(LEVEL|HOURS)/i);
  const layout=await page.evaluate(()=>{
    const sign=document.querySelector('.dv03-milestone-strip .hours-sign').getBoundingClientRect();
    const strip=document.querySelector('.dv03-milestone-strip').getBoundingClientRect();
    const windshield=document.querySelector('.dv03-windshield').getBoundingClientRect();
    const meta=document.querySelector('.dash-status-meta').getBoundingClientRect();
    const status=document.querySelector('.dash-status').getBoundingClientRect();
    return{
      signTop:sign.top,
      signWidth:sign.width,
      stripTop:strip.top,
      windshieldBottom:windshield.bottom,
      metaRight:meta.right,
      statusRight:status.right,
    };
  });
  expect(layout.signWidth).toBeGreaterThan(230);
  expect(layout.stripTop).toBeGreaterThanOrEqual(layout.windshieldBottom);
  expect(layout.signTop).toBeGreaterThanOrEqual(layout.windshieldBottom);
  expect(Math.abs(layout.statusRight-layout.metaRight)).toBeLessThan(20);
  const colors=await page.evaluate(()=>({local:getComputedStyle(document.querySelector('.local-time-status')).color,localValue:getComputedStyle(document.querySelector('#dash-clock')).color,night:getComputedStyle(document.querySelector('#night-time-value')).color,driver:getComputedStyle(document.body).getPropertyValue('--dv-driver-highlight').trim()}));
  expect(colors.local).toBe(colors.localValue);
  expect(colors.local).not.toBe(colors.night);
  expect(colors.driver).not.toBe('');
});

test('DV03 remains coherent at the mobile breakpoint',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/log/');
  await page.getByRole('button',{name:'Preview DV03 with synthetic data'}).click();
  await expect(page.locator('#dv03-hero')).toBeVisible();
  await expect(page.locator('.dv03-milestone-strip .hours-sign')).toBeVisible();
  await expect(page.locator('.dv03-cockpit-frame')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
});

test('Old Experience remains available at its versioned route',async({page})=>{
  await page.goto('/log/DV02/');
  await expect(page.locator('.experience-bar')).toContainText('Old Experience');
  await expect(page.locator('html')).toHaveAttribute('data-dv-route','dv02');
});

test('legacy console URLs preserve query strings while retired DV01 lands on Current Experience',async({page})=>{
  await page.goto('/log/game/?return=%2Ffamily%2F');
  await expect(page).toHaveURL(/\/log\/\?return=%2Ffamily%2F$/);
  await page.goto('/log/game/DV01/?return=driver');
  await expect(page).toHaveURL(/\/log\/\?return=driver$/);
  await page.goto('/log/game/DV03/?return=driver');
  await expect(page).toHaveURL(/\/log\/\?return=driver$/);
});
