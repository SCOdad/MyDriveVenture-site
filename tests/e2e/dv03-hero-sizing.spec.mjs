import {test,expect} from '@playwright/test';
import fs from 'node:fs';

// Use the real route markup and stylesheet order, isolated from auth/network data.
const html=fs.readFileSync(new URL('../../log/index.html',import.meta.url),'utf8')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'')
  .replace('id="app-main" class="app-hidden"','id="app-main"');

for(const width of [320,390,430,760,761,768,1280]){
  test(`DV03 visible hero composition at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:900});
    await page.route('**/log/',route=>route.fulfill({contentType:'text/html',body:html}));
    await page.goto('/log/');
    const hero=page.locator('#dv03-hero');
    await expect(hero).toBeVisible();
    await expect.poll(()=>hero.evaluate(e=>e.complete&&e.naturalWidth)).toBe(1536);
    // Parker plus synthetic custom derivatives spanning the validator's accepted bounds.
    // These fixtures contain no private photographs or production driver data.
    for(const bounds of [[13,519,456,1024],[8,470,500,1024],[32,560,420,1024]]){
      if(bounds[1]!==519)await hero.evaluate(async(e,b)=>{
        const c=document.createElement('canvas');c.width=1536;c.height=1024;
        const x=c.getContext('2d');x.fillStyle='#f8ba20';x.fillRect(b[0],b[1],b[2]-b[0],b[3]-b[1]);
        e.src=c.toDataURL();e.dataset.dvHeroSource='custom';await e.decode();
      },bounds);
      const geometry=await hero.evaluate((e,b)=>{
        const s=getComputedStyle(e),r=e.getBoundingClientRect();
        const layer=e.parentElement.getBoundingClientRect();
        const scale=(s.objectFit==='cover'?Math.max:Math.min)(r.width/e.naturalWidth,r.height/e.naturalHeight);
        // Both the approved old desktop and new mobile use left/bottom object positioning.
        const left=r.left+b[0]*scale,top=r.bottom-(e.naturalHeight-b[1])*scale;
        const right=r.left+b[2]*scale,bottom=r.bottom;
        return {fit:s.objectFit,left:left-layer.left,top:top-layer.top,
          visibleHeight:(Math.min(bottom,layer.bottom)-Math.max(top,layer.top))/layer.height,
          visibleWidth:(right-left)/layer.width,layerWidth:layer.width,
          boxWidth:r.width,boxHeight:r.height,layerHeight:layer.height,
          overflow:document.documentElement.scrollWidth-innerWidth};
      },bounds);
      expect(geometry.overflow).toBeLessThanOrEqual(0);
      if(width<=760){
        expect(geometry.fit).toBe('contain');
        expect(geometry.visibleHeight).toBeGreaterThan(.77);
        expect(geometry.visibleHeight).toBeLessThan(.96);
        expect(geometry.top).toBeGreaterThanOrEqual(0);
        expect(geometry.left).toBeGreaterThanOrEqual(0);
        expect(geometry.visibleWidth).toBeLessThan(.60);
      }else{
        // Preserve the existing desktop box/cover composition exactly.
        expect(geometry.fit).toBe('cover');
        expect(geometry.boxWidth).toBeCloseTo(geometry.layerWidth,0);
        expect(geometry.boxHeight).toBeCloseTo(geometry.layerHeight,0);
      }
    }
  });
}
