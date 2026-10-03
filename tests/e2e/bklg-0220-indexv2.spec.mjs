import { test, expect } from '@playwright/test';
const homepage = process.env.DV_HOMEPAGE_PATH || '/';

for (const width of [320, 390, 768, 1440]) {
  test(`indexV2: hierarchy, semantics, navigation and targets at ${width}px`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setViewportSize({width, height:900});
    await page.goto(homepage);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Turn practiceinto progress.');
    await expect(page.locator('a[href*="waitlist"]')).toHaveCount(0);
    await expect(page.locator('a.primary[href="/join/"]')).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width <= 760) await page.getByRole('button', {name:'Menu'}).click();
    for (const link of await page.locator('a:visible, button:visible').all()) {
      const box = await link.boundingBox();
      expect(box.height, await link.textContent()).toBeGreaterThanOrEqual(48);
      expect(box.width, await link.textContent()).toBeGreaterThanOrEqual(48);
    }
    await expect(page.getByRole('link',{name:'Log Your Drive',exact:true})).toHaveAttribute('href','/log/');
    await page.getByRole('link',{name:'How it works',exact:true}).click();
    const top = await page.locator('#how-it-works').evaluate(e=>e.getBoundingClientRect().top);
    const headerBottom = await page.locator('header').evaluate(e=>e.getBoundingClientRect().bottom);
    expect(top).toBeGreaterThanOrEqual(headerBottom);
    expect(errors).toEqual([]);
  });
}

test('mobile menu works with keyboard, Escape and viewport changes', async ({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(homepage);
  const menu=page.getByRole('button',{name:'Menu'});
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toHaveAttribute('aria-expanded','true');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link',{name:'How it works',exact:true})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(page.locator('#primary-nav')).toBeHidden();
  await page.setViewportSize({width:1440,height:900});
  await expect(page.locator('#primary-nav')).toBeVisible();
  await expect(menu).toBeHidden();
});

test('CTA handoff keeps grown-up-first two-field onboarding',async({page})=>{
  await page.goto(homepage);
  await page.locator('.hero .primary').click();
  await expect(page).toHaveURL(/\/join\/$/);
  await expect(page.getByRole('textbox')).toHaveCount(2);
  await expect(page.locator('input[name="name"]')).toHaveAttribute('autocomplete','name');
  await expect(page.locator('input[name="email"]')).toHaveAttribute('type','email');
  await expect(page.locator('input[name="email"]')).toHaveAttribute('autocomplete','email');
});

test('all local indexV2 destinations and image assets resolve',async({page,request})=>{
  await page.goto(homepage);
  const paths=await page.locator('a[href^="/"],img').evaluateAll(els=>[...new Set(els.map(e=>e.getAttribute('href')||e.getAttribute('src')))]);
  for(const path of paths) expect((await request.get(path)).status(),path).toBe(200);
});

test('DEV does not send production analytics',async({page})=>{
  const analytics=[];
  page.on('request',r=>{if(/google-analytics.com|googletagmanager.com|connect.facebook.net|facebook.com\/tr/.test(r.url()))analytics.push(r.url());});
  await page.goto(homepage);
  if (homepage === '/') await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  else await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex,nofollow');
  expect(analytics).toEqual([]);
});

test('navigation and conversion still work without JavaScript',async({browser,baseURL})=>{
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844},baseURL});
  const page=await context.newPage();
  await page.goto(homepage);
  await expect(page.getByRole('link',{name:'Log Your Drive',exact:true})).toBeVisible();
  await page.locator('.hero .primary').click();
  await expect(page).toHaveURL(/\/join\/$/);
  await context.close();
});

test('phones load the mobile cockpit and can scroll its full content',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const assets=[];
  page.on('request',r=>{if(r.url().includes('indexv2-cockpit'))assets.push(r.url());});
  await page.goto(homepage);
  await expect(page.locator('.product-proof img')).toHaveJSProperty('currentSrc',new URL('/assets/images/indexv2-cockpit-mobile.webp',page.url()).href);
  expect(assets.some(url=>url.endsWith('/indexv2-cockpit.webp'))).toBe(false);
  await expect(page.getByRole('button',{name:'Text',exact:true})).toBeVisible();
  await expect(page.locator('[data-preview-view="web"]')).toBeHidden();
  const viewport=page.locator('.proof-viewport');
  await viewport.focus();
  await page.keyboard.press('PageDown');
  await expect.poll(()=>viewport.evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
});

test('desktop cockpit carousel changes view manually and survives resizing',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto(homepage);
  const mobile=page.getByRole('button',{name:'Mobile',exact:true});
  const web=page.getByRole('button',{name:'Web',exact:true});
  await expect(web).toHaveAttribute('aria-pressed','true');
  const before=await page.locator('.product-proof').boundingBox();
  await mobile.focus();await page.keyboard.press('Enter');
  await expect(mobile).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.product-proof img')).toHaveAttribute('src','/assets/images/indexv2-cockpit-mobile.webp');
  const after=await page.locator('.product-proof').boundingBox();
  expect(Math.abs(after.height-before.height)).toBeLessThan(2);
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByRole('button',{name:'Text',exact:true})).toBeVisible();
  await expect(page.locator('[data-preview-view="web"]')).toBeHidden();
  await page.setViewportSize({width:1440,height:900});
  await expect(mobile).toHaveAttribute('aria-pressed','true');
  await web.click();
  await expect(page.locator('.product-proof img')).toHaveAttribute('src','/assets/images/indexv2-cockpit.webp');
});

for (const width of [390,1440]) {
  test(`Text demo loads on demand, plays and pauses when leaving at ${width}px`,async({page})=>{
    const requests=[];
    page.on('request',r=>{if(r.url().endsWith('.mp4'))requests.push(r.url());});
    await page.setViewportSize({width,height:900});
    await page.goto(homepage);
    const video=page.locator('video');
    await expect(video).not.toHaveAttribute('src');
    expect(requests).toEqual([]);
    await page.getByRole('button',{name:'Text',exact:true}).click();
    await expect(video).toBeVisible();
    await expect.poll(()=>video.evaluate(v=>v.currentTime)).toBeGreaterThan(0);
    expect(await video.evaluate(v=>v.error)).toBeNull();
    expect(await video.evaluate(v=>v.duration)).toBeGreaterThan(20);
    await page.getByText('Read the video transcript',{exact:true}).click();
    await expect(page.locator('.text-demo-details ol')).toBeVisible();
    await page.getByRole('button',{name:width<760?'Mobile':'Web',exact:true}).click();
    await expect(video).toBeHidden();
    await expect(video).toHaveJSProperty('paused',true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  });
}
