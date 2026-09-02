import {test,expect} from '@playwright/test';

async function openSceneLab(page){
  await page.goto('/log/DV03/v2/');
  await page.getByRole('button',{name:'Preview DV03 with synthetic data'}).click();
  await page.getByRole('button',{name:'SCENE'}).click();
  await expect(page.locator('#dv03-harness-panel')).toBeVisible();
}

test('DV03 v2 harness previews every zone without touching awards',async({page})=>{
  await openSceneLab(page);
  await page.locator('[data-dv-zone="sky"]').selectOption('S1');
  await page.locator('[data-dv-zone="weather"]').selectOption('S3');
  await page.locator('[data-dv-zone="road"]').selectOption('R2');
  await page.locator('[data-dv-zone="destination"]').selectOption('L9');
  await page.locator('[data-dv-zone="billboard"]').selectOption('M2');
  await expect(page.locator('#dv03-sky-treatment-layer')).toHaveAttribute('data-dv-asset','S1');
  await expect(page.locator('#dv03-weather-layer')).toHaveAttribute('data-dv-asset','S3');
  await expect(page.locator('#dv03-road-treatment-layer')).toHaveAttribute('data-dv-asset','R2');
  await expect(page.locator('#dv03-destination-layer')).toHaveAttribute('data-dv-asset','L9');
  await expect(page.locator('#dv03-billboard-layer')).toHaveAttribute('data-dv-asset','M2');

  const layout=await page.evaluate(()=>{
    const harness=document.querySelector('#dv03-scene-harness').getBoundingClientRect();
    const windshield=document.querySelector('.dv03-windshield').getBoundingClientRect();
    const z=selector=>Number(getComputedStyle(document.querySelector(selector)).zIndex);
    return{harnessBottom:harness.bottom,windshieldTop:windshield.top,sign:z('.dv03-sign-layer'),weather:z('.dv03-weather-layer'),cockpit:z('.dv03-cockpit-frame-layer'),hero:z('.dv03-hero-layer')};
  });
  expect(layout.harnessBottom).toBeLessThanOrEqual(layout.windshieldTop);
  expect(layout.sign).toBeLessThan(layout.weather);
  expect(layout.weather).toBeLessThan(layout.cockpit);
  expect(layout.cockpit).toBeLessThan(layout.hero);

  await page.getByRole('button',{name:'Reset to Base Scene'}).click();
  await expect(page.locator('.dv03-windshield')).toHaveAttribute('data-dv-scene-assets','');
  await page.getByRole('button',{name:'Reset to Driver Scene'}).click();
  await expect(page.locator('.dv03-windshield')).toHaveAttribute('data-dv-scene-mode','driver');
});

test('DV03 v2 harness remains outside the mobile windshield',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await openSceneLab(page);
  await page.locator('[data-dv-zone="weather"]').selectOption('S2');
  await expect(page.locator('#dv03-weather-layer')).toHaveAttribute('data-dv-asset','S2');
  const geometry=await page.evaluate(()=>{
    const harness=document.querySelector('#dv03-scene-harness').getBoundingClientRect();
    const windshield=document.querySelector('.dv03-windshield').getBoundingClientRect();
    return{width:document.documentElement.scrollWidth,harnessBottom:harness.bottom,windshieldTop:windshield.top};
  });
  expect(geometry.width).toBe(390);
  expect(geometry.harnessBottom).toBeLessThanOrEqual(geometry.windshieldTop);
});
