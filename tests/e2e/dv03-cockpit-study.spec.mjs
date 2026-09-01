import { mkdirSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'mobile-390x844', width: 390, height: 844 },
  { name: 'mobile-430x932', width: 430, height: 932 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'desktop-1280x900', width: 1280, height: 900 }
];

test.describe('DV03 unauthenticated cockpit study', () => {
  for (const viewport of viewports) {
    test(`${viewport.name} renders and composes the layered cockpit`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const backendCalls=[];
      page.on('request',request=>{
        const url=request.url();
        if(url.includes('supabase.co') && (/\/rest\/v1\//.test(url)||/\/functions\/v1\//.test(url)||/\/rpc\//.test(url))) backendCalls.push(url);
      });

      await page.goto('/log/game/DV03/', { waitUntil: 'networkidle' });

      await expect(page.getByText('DV03 VISUAL STUDY')).toBeVisible();
      await expect(page.getByText(/Unauthenticated · synthetic data · read-only/)).toBeVisible();
      await expect(page.locator('.dv03-windshield')).toBeVisible();
      await expect(page.locator('.dv03-sky')).toBeVisible();
      await expect(page.locator('.dv03-landscape')).toBeVisible();
      await expect(page.locator('.dv03-world')).toBeVisible();
      await expect(page.locator('.dv03-cockpit-mask')).toBeVisible();
      await expect(page.locator('.dv03-a-pillar-left')).toBeVisible();
      await expect(page.locator('.dv03-a-pillar-right')).toBeVisible();
      await expect(page.locator('.dv03-roof-edge')).toBeVisible();
      await expect(page.locator('.dv03-rearview')).toBeVisible();
      await expect(page.locator('.dv03-hero-canvas')).toBeVisible();
      await expect(page.locator('.dv03-milestone-sign')).toBeVisible();

      const hero=page.locator('#dv03-hero');
      await expect(hero).toBeVisible();
      await expect(hero).toHaveAttribute('data-dv03-hero-parts','3');
      await expect.poll(async()=>hero.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
      await expect.poll(async()=>hero.evaluate(img=>img.complete && img.naturalWidth>0 && img.naturalHeight>0)).toBe(true);

      const metrics=await page.evaluate(()=>{
        const rect=selector=>document.querySelector(selector)?.getBoundingClientRect();
        const w=rect('.dv03-windshield');
        const h=rect('#dv03-hero');
        const c=rect('.dv03-hero-canvas');
        const m=rect('.dv03-milestone-sign');
        const overlap=(a,b)=>Boolean(a&&b&&a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);

        const pct=(value,total)=>total ? (value/total)*100 : null;

        return {
          scrollWidth:document.documentElement.scrollWidth,
          clientWidth:document.documentElement.clientWidth,
          heroNaturalWidth:document.querySelector('#dv03-hero')?.naturalWidth||0,
          heroNaturalHeight:document.querySelector('#dv03-hero')?.naturalHeight||0,
          canvasRatio:c?c.width/c.height:null,
          windshieldHeight:w?w.height:null,
          heroAnchoredInCanvas:h&&c?Math.abs(h.left-c.left)<=1&&Math.abs(h.top-c.top)<=1&&Math.abs(h.width-c.width)<=1&&h.height<=c.height+1:false,
          heroLeftPct:w&&h?pct(h.left-w.left,w.width):null,
          heroTopPct:w&&h?pct(h.top-w.top,w.height):null,
          heroWidthPct:w&&h?pct(h.width,w.width):null,
          heroHeightPct:w&&h?pct(h.height,w.height):null,
          heroBottomGapPct:w&&h?pct(w.bottom-h.bottom,w.height):null,
          milestoneLeftPct:w&&m?pct(m.left-w.left,w.width):null,
          milestoneTopPct:w&&m?pct(m.top-w.top,w.height):null,
          milestoneWidthPct:w&&m?pct(m.width,w.width):null,
          heroMilestoneOverlap:overlap(h,m)
        };
      });

      console.log('DV03_RENDER_METRICS', viewport.name, JSON.stringify(metrics));

      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth+1);
      expect(metrics.heroNaturalWidth).toBeGreaterThan(0);
      expect(metrics.heroNaturalHeight).toBeGreaterThan(0);
      expect(metrics.canvasRatio).toBeCloseTo(2/3,2);
      expect(metrics.heroAnchoredInCanvas).toBe(true);
      if(viewport.width<=760){
        expect(metrics.windshieldHeight).toBeCloseTo(190,0);
      }else{
        expect(metrics.windshieldHeight).toBeGreaterThanOrEqual(220);
        expect(metrics.windshieldHeight).toBeLessThanOrEqual(376);
      }

      // Rendered-composition guardrails. These are intentionally windshield-relative,
      // not assertions that simply mirror CSS declarations.
      expect(metrics.heroLeftPct).toBeGreaterThanOrEqual(1);
      expect(metrics.heroLeftPct).toBeLessThanOrEqual(6);
      expect(metrics.heroTopPct).toBeGreaterThanOrEqual(4);
      expect(metrics.heroTopPct).toBeLessThanOrEqual(6);
      expect(metrics.heroWidthPct).toBeGreaterThanOrEqual(viewport.width<=760?44:33);
      expect(metrics.heroWidthPct).toBeLessThanOrEqual(viewport.width<=760?46:40);
      expect(metrics.heroHeightPct).toBeGreaterThan(95);
      expect(metrics.heroBottomGapPct).toBeLessThan(1);

      expect(metrics.milestoneLeftPct).toBeGreaterThanOrEqual(55);
      expect(metrics.milestoneTopPct).toBeGreaterThanOrEqual(5);
      expect(metrics.milestoneTopPct).toBeLessThanOrEqual(35);
      expect(metrics.milestoneWidthPct).toBeLessThanOrEqual(35);
      expect(metrics.heroMilestoneOverlap).toBe(false);
      expect(backendCalls).toEqual([]);

      // Always retain visual evidence so layout failures are reviewed before human QA.
      const evidenceDir='test-results/dv03-evidence';
      mkdirSync(evidenceDir,{recursive:true});
      await page.screenshot({
        path:`${evidenceDir}/${viewport.name}-full.png`,
        fullPage:true,
        animations:'disabled'
      });
      await page.locator('.dv03-windshield').screenshot({
        path:`${evidenceDir}/${viewport.name}-windshield.png`,
        animations:'disabled'
      });
    });
  }
});
