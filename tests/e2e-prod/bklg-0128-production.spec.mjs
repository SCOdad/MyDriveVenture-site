import { test, expect } from '@playwright/test';

const marker = '20260912-final-assets1';
const assets = [
  '/assets/images/dv03/layers/night.png',
  '/assets/images/dv03/layers/park.png',
  '/assets/images/dv03/layers/DV03-L2-SCHOOL-BACKGROUND.png',
  '/assets/images/dv03/layers/DV03-L4-GROCERY-STORE-BACKGROUND.png',
  '/assets/images/dv03/layers/DV03-L5-LIBRARY-BACKGROUND.png',
  '/assets/images/dv03/layers/DV03-L6-SNACK-RUN-BACKGROUND.png',
  '/assets/images/dv03/layers/DV03-L7-DRIVE-THRU-BACKGROUND.png',
  '/assets/images/dv03/layers/DV03-L8-CAR-WASH-BACKGROUND.png',
  '/assets/images/dv03/layers/DV03-L9-GAS-STATION-BACKGROUND.png'
];

test('BKLG-0128 production publishes fresh harness and viable layer assets', async ({ page }) => {
  let fresh = false;
  for (let i = 0; i < 12; i += 1) {
    await page.goto(`/log/DV03/staging/BKLG-0128/?prodcheck=${Date.now()}`, { waitUntil: 'domcontentloaded' });
    const html = await page.content();
    if (html.includes(marker)) { fresh = true; break; }
    await page.waitForTimeout(5000);
  }
  expect(fresh, 'production staging HTML never published the new cache-buster').toBe(true);

  const harnessSource=await (await page.request.get(`/assets/js/bklg-0128-dv03-staging.js?prodcheck=${Date.now()}`)).text();
  const currentSource=await (await page.request.get(`/assets/js/bklg-0128-scenery-current.js?prodcheck=${Date.now()}`)).text();
  const compositionSource=await (await page.request.get(`/assets/js/bklg-0128-composition-uat.js?prodcheck=${Date.now()}`)).text();
  expect(harnessSource).toContain("{key:'02',id:'road',label:'Road / Ground'");
  expect(harnessSource).toContain("{key:'03',id:'background',label:'Background'");
  expect(harnessSource).toContain("value:'drive-thru',label:'Drive Thru'");
  expect(harnessSource).toContain('03-BACKGROUND-DRIVE-THRU');
  expect(harnessSource).toContain('02-ROAD-GROUND-BASE');
  expect(harnessSource).toContain('z-index:2!important');
  expect(harnessSource).toContain('z-index:3!important');
  expect(currentSource).toContain('DV03-L5-LIBRARY-BACKGROUND.png');
  expect(currentSource).toContain('DV03-L6-SNACK-RUN-BACKGROUND.png');
  expect(currentSource).toContain('DV03-L7-DRIVE-THRU-BACKGROUND.png');
  expect(currentSource).toContain('DV03-L8-CAR-WASH-BACKGROUND.png');
  expect(currentSource).toContain('721c2d7-library');
  expect(currentSource).toContain('56aafef-snack-run');
  expect(currentSource).toContain('721c2d7-drive-thru');
  expect(currentSource).toContain('e83616b-car-wash');
  expect(currentSource).not.toContain("createElement('button')");
  expect(compositionSource).toContain("api.state.road='off'");
  expect(compositionSource).toContain('Scenery Only');
  expect(compositionSource).toContain('Billboard Only');
  expect(compositionSource).toContain('Both');

  for (const src of assets) {
    const dimensions = await page.evaluate(async (src) => {
      const img = new Image();
      img.src = `${src}?prodcheck=${Date.now()}`;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error(`failed to load ${src}`));
      });
      return { width: img.naturalWidth, height: img.naturalHeight };
    }, src);
    expect(dimensions.width, `${src} width`).toBeGreaterThan(100);
    expect(dimensions.height, `${src} height`).toBeGreaterThan(100);
  }
});

test('BKLG-0128 production DV03 can visibly compose Night, optional Ground, and destination backgrounds in layer order', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/log/?prodcheck=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    document.querySelector('#app-main')?.classList.remove('app-hidden');
    const login = document.querySelector('#app-login');
    if (login) login.style.display = 'none';
    const windshield=document.querySelector('.dv03-windshield');
    const sky = document.querySelector('.dv03-sky');
    const landscape = document.querySelector('.dv03-landscape');
    const scene = document.querySelector('#dv03-scene-layer');
    const sourceRoad=document.querySelector('.dv03-road');
    if (!windshield || !sky || !landscape || !scene || !sourceRoad) throw new Error('DV03 layer DOM is missing in production');
    sky.querySelectorAll('.dv03-cloud').forEach(node => node.style.display = 'none');
    sky.style.backgroundImage = 'url("/assets/images/dv03/layers/night.png")';
    sky.style.zIndex='1';
    let ground=document.querySelector('#prod-bklg0128-ground');
    if(!ground){ground=document.createElement('div');ground.id='prod-bklg0128-ground';ground.style.cssText='position:absolute;inset:0;z-index:2;pointer-events:none';ground.appendChild(sourceRoad.cloneNode(true));windshield.insertBefore(ground,scene);}
    landscape.style.display = 'none';
    scene.style.display = 'block';
    scene.style.zIndex='3';
    scene.style.backgroundImage = 'url("/assets/images/dv03/layers/DV03-L8-CAR-WASH-BACKGROUND.png")';
    scene.style.backgroundRepeat = 'no-repeat';
    scene.style.backgroundPosition = 'center';
    scene.style.backgroundSize = '100% 100%';
  });
  const skyZ=await page.locator('.dv03-sky').evaluate(el=>Number(getComputedStyle(el).zIndex));
  const groundZ=await page.locator('#prod-bklg0128-ground').evaluate(el=>Number(getComputedStyle(el).zIndex));
  const sceneZ=await page.locator('#dv03-scene-layer').evaluate(el=>Number(getComputedStyle(el).zIndex));
  const destinationBackground = await page.locator('#dv03-scene-layer').evaluate(el => getComputedStyle(el).backgroundImage);
  expect(skyZ).toBeLessThan(groundZ);
  expect(groundZ).toBeLessThan(sceneZ);
  expect(destinationBackground).toContain('DV03-L8-CAR-WASH-BACKGROUND.png');
  await expect(page.locator('.dv03-windshield')).toBeVisible();
  await page.locator('.dv03-windshield').screenshot({ path: 'test-results-prod/bklg-0128-night-ground-car-wash.png' });
});

test('production presentation source matches checkout and durable scenery survives featured expiry',async({page})=>{
  const {readFileSync}=await import('node:fs');
  for(const file of ['log/index.html','log/DV03/staging/BKLG-0128/index.html','assets/js/dv03-presentation.js','assets/js/log-game-dv03.js','assets/js/log-drive-rpc.js','assets/css/log-game-dv03.css','assets/js/bklg-0128-dv03-staging.js','assets/js/bklg-0128-composition-uat.js']){
    const expected=readFileSync(file,'utf8');
    await expect.poll(async()=>{const response=await page.request.get(`/${file}?exact=${Date.now()}`);return response.ok()&&(await response.text())===expected},{timeout:45000,intervals:[1000,3000,5000]}).toBe(true);
  }
  await page.clock.install({time:new Date('2026-09-11T23:00:00Z')});
  await page.goto('/log/');
  await page.evaluate(()=>{
    document.getElementById('app-main').classList.remove('app-hidden');document.getElementById('app-login').style.display='none';
    const awards=[{driver_id:'synthetic',drive_id:'synthetic-drive',quest_key:'Q000039',awarded_at:'2020-01-01T00:00:00Z',xp_awarded:300,quest:{display_order:39,name:'Library'}},{driver_id:'synthetic',drive_id:'synthetic-drive',quest_key:'Q000006',awarded_at:'2020-01-01T00:00:00Z',xp_awarded:1,quest:{display_order:4,name:'Featured milestone'}}];
    window.DV_GAME_DV03.renderScene({driverId:'synthetic',driver:{timezone:'UTC'},model:{quest_awards:awards}});
    window.dispatchEvent(new CustomEvent('dv:drive-awarded',{detail:{driverId:'synthetic',driveId:'synthetic-drive',awards}}));
  });
  await expect(page.locator('.dv03-sky')).toHaveAttribute('data-dv-sky','night');
  await expect(page.locator('.dv03-sign-layer')).toBeVisible();
  await expect(page.locator('#hours-sign')).toHaveText('Featured milestone');
  await page.clock.fastForward(12001);
  await expect(page.locator('.dv03-sign-layer')).toBeHidden();
  await expect(page.locator('#dv03-scene-layer')).toHaveAttribute('data-dv-scene','library');
});
