import { test, expect } from '@playwright/test';

test.describe('DV03 unauthenticated cockpit study', () => {
  for (const viewport of [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'desktop', width: 1280, height: 900 }
  ]) {
    test(`${viewport.name} renders the isolated layered cockpit without overflow`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const backendCalls=[];
      page.on('request',request=>{
        const url=request.url();
        if(url.includes('supabase.co') && (/\/rest\/v1\//.test(url)||/\/functions\/v1\//.test(url)||/\/rpc\//.test(url))) backendCalls.push(url);
      });

      await page.goto('/log/game/DV03/');
      await expect(page.getByText('DV03 VISUAL STUDY')).toBeVisible();
      await expect(page.getByText(/Unauthenticated · synthetic data · read-only/)).toBeVisible();
      await expect(page.locator('.dv03-windshield')).toBeVisible();
      await expect(page.locator('.dv03-sky')).toBeVisible();
      await expect(page.locator('.dv03-landscape')).toBeVisible();
      await expect(page.locator('.dv03-cockpit-mask')).toBeVisible();
      await expect(page.locator('.dv03-milestone-sign')).toBeVisible();

      const hero=page.locator('#dv03-hero');
      await expect(hero).toBeVisible();
      await expect(hero).toHaveAttribute('data-dv03-hero-parts','3');
      await expect.poll(async()=>hero.getAttribute('src')).toMatch(/^data:image\/png;base64,/);

      const metrics=await page.evaluate(()=>({
        scrollWidth:document.documentElement.scrollWidth,
        clientWidth:document.documentElement.clientWidth,
        heroNaturalWidth:document.querySelector('#dv03-hero')?.naturalWidth||0,
        heroNaturalHeight:document.querySelector('#dv03-hero')?.naturalHeight||0
      }));
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth+1);
      expect(metrics.heroNaturalWidth).toBeGreaterThan(0);
      expect(metrics.heroNaturalHeight).toBeGreaterThan(0);
      expect(backendCalls).toEqual([]);
    });
  }
});
