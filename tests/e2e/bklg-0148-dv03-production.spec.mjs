import {test,expect} from '@playwright/test';

test.skip(process.env.DV_E2E_PRODUCTION!=='1','Production-only verification');

for(const viewport of [
  {name:'mobile-small',width:390,height:844},
  {name:'mobile-large',width:430,height:932},
  {name:'tablet',width:768,height:1024},
  {name:'desktop',width:1280,height:900}
])test(`production DV03 is authenticated-only and coherent at ${viewport.name}`,async({page})=>{
  await page.setViewportSize(viewport);
  await page.goto('/log/game/DV03/');
  await expect(page).toHaveTitle('Drive Venture — DV03 Driver Console');
  await expect(page.getByText('DV02 remains default').first()).toBeVisible();
  await expect(page.getByRole('textbox',{name:'Player email'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Preview DV03 with synthetic data'})).toBeHidden();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('production DV02 remains the default route',async({page})=>{
  await page.goto('/log/');
  await expect(page).toHaveURL(/\/log\/game\/$/);
  await expect(page.getByText('DV-02 / DRIVER CONSOLE')).toBeVisible();
});
