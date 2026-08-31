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
      await expect(page.locator('.dv03-hero-canvas')).toBeVisible();
      await expect(page.locator('.dv03-milestone-sign')).toBeVisible();

      const hero=page.locator('#dv03-hero');
      await expect(hero).toBeVisible();
      await expect(hero).toHaveAttribute('data-dv03-hero-parts','3');
      await expect.poll(async()=>hero.getAttribute('src')).toMatch(/^data:image\/png;base64,/);

      const metrics=await page.evaluate(()=>{
        const hero=document.querySelector('#dv03-hero');
        const canvas=document.querySelector('.dv03-hero-canvas');
        const h=hero?.getBoundingClientRect();
        const c=canvas?.getBoundingClientRect();
        return {
          scrollWidth:document.documentElement.scrollWidth,
          clientWidth:document.documentElement.clientWidth,
          heroNaturalWidth:hero?.naturalWidth||0,
          heroNaturalHeight:hero?.naturalHeight||0,
          heroLeftPct:h&&c?((h.left-c.left)/c.width)*100:null,
          heroTopPct:h&&c?((h.top-c.top)/c.height)*100:null,
          heroRightPct:h&&c?((h.right-c.left)/c.width)*100:null,
          heroBottomPct:h&&c?((h.bottom-c.top)/c.height)*100:null,
          canvasRatio:c?c.width/c.height:null
        };
      });
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth+1);
      expect(metrics.heroNaturalWidth).toBeGreaterThan(0);
      expect(metrics.heroNaturalHeight).toBeGreaterThan(0);
      expect(metrics.canvasRatio).toBeCloseTo(2/3,2);
      expect(metrics.heroLeftPct).toBeCloseTo(2,1);
      expect(metrics.heroTopPct).toBeCloseTo(40,1);
      expect(metrics.heroRightPct).toBeCloseTo(70,1);
      expect(metrics.heroBottomPct).toBeGreaterThan(94);
      expect(metrics.heroBottomPct).toBeLessThan(97);
      expect(backendCalls).toEqual([]);
    });
  }
});
