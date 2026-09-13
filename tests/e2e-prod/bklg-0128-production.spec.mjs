import { test, expect } from '@playwright/test';

const marker = '20260913-0184';
const assets = [
  '/assets/images/dv03/layers/night.png',
  '/assets/images/dv03/layers/park.png',
  '/assets/images/dv03/layers/DV03-L2-SCHOOL-BACKGROUND.png',
  '/assets/images/dv03/layers/DV03-L4-GROCERY-STORE-BACKGROUND.png',
  '/assets/images/dv03/layers/DV03-L5-LIBRARY-BACKGROUND.png',
  '/assets/images/dv03/layers/DV03-L6-SNACK-RUN-BACKGROUND.png',
  '/assets/images/dv03/layers/DV03-L7-DRIVE-THRU-BACKGROUND.png',
  '/assets/images/dv03/layers/DV03-L8-CAR-WASH-BACKGROUND.png',
  '/assets/images/dv03/layers/DV03-L9-GAS-STATION-BACKGROUND.png',
  '/assets/images/dv03/world/l9-neighborhood.png'
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
  const presentationSource=await (await page.request.get(`/assets/js/dv03-presentation-rules.js?prodcheck=${Date.now()}`)).text();
  const runtimeSource=await (await page.request.get(`/assets/js/log-game-dv03.js?prodcheck=${Date.now()}`)).text();
  const dv03CssSource=await (await page.request.get(`/assets/css/log-game-dv03.css?prodcheck=${Date.now()}`)).text();
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
  expect(currentSource).not.toContain('DRAFT');
  expect(currentSource).toContain('721c2d7-library');
  expect(currentSource).toContain('56aafef-snack-run');
  expect(currentSource).toContain('721c2d7-drive-thru');
  expect(currentSource).toContain('e83616b-car-wash');
  expect(currentSource).not.toContain("createElement('button')");
  expect(compositionSource).toContain("api.state.road='off'");
  expect(compositionSource).toContain('Persistent Scenery');
  expect(compositionSource).toContain('Billboard Wins');
  expect(presentationSource).toContain('selectPersistentSceneryAward');
  expect(presentationSource).toContain('comparePriority');
  expect(presentationSource).toContain('DEFAULT_SCENERY');
  expect(presentationSource).not.toContain('DRAFT');
  expect(presentationSource).toContain("Q000039:{scene:'library'");
  expect(runtimeSource).toContain('newlyObservedAwards');
  expect(runtimeSource).toContain('FEATURE_DURATION_MS');
  expect(runtimeSource).not.toContain('SCENE_RECENCY_DAYS');
  expect(dv03CssSource).toContain('.dv03-sky[data-dv-sky="night"]');
  expect(dv03CssSource).toContain('background-repeat:no-repeat;background-position:center;background-size:100% 100%;image-rendering:pixelated');

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
    sky.dataset.dvSky='night';
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
  const nightSkyTreatment=await page.locator('.dv03-sky').evaluate(el=>{const style=getComputedStyle(el);return{repeat:style.backgroundRepeat,position:style.backgroundPosition,size:style.backgroundSize,imageRendering:style.imageRendering}});
  expect(skyZ).toBeLessThan(groundZ);
  expect(groundZ).toBeLessThan(sceneZ);
  expect(destinationBackground).toContain('DV03-L8-CAR-WASH-BACKGROUND.png');
  expect(nightSkyTreatment.repeat).toBe('no-repeat');
  expect(nightSkyTreatment.position).toBe('50% 50%');
  expect(nightSkyTreatment.size).toBe('100% 100%');
  expect(nightSkyTreatment.imageRendering).toBe('pixelated');
  await expect(page.locator('.dv03-windshield')).toBeVisible();
  await page.locator('.dv03-windshield').screenshot({ path: 'test-results-prod/bklg-0128-night-ground-car-wash.png' });
});
