import {test,expect} from '@playwright/test';
const award=(key,order,xp,date='2020-01-01T00:00:00Z')=>({id:key,driver_id:'synthetic',drive_id:'new-drive',quest_key:key,awarded_at:date,xp_awarded:xp,quest:{display_order:order,name:`Award ${key}`}});
async function setup(page){
  await page.goto('/log/');
  await page.waitForFunction(()=>Boolean(window.DV_GAME_DV03&&window.DV03_PRESENTATION));
  await page.evaluate(()=>{document.getElementById('app-main').classList.remove('app-hidden');document.getElementById('app-login').style.display='none'});
}
async function render(page,awards,timezone='UTC'){
  await page.evaluate(({awards,timezone})=>window.DV_GAME_DV03.renderScene({driverId:'synthetic',driver:{timezone},model:{quest_awards:awards}}),{awards,timezone});
}
for(const width of [390,1280])test(`persistent scenery and temporary featured billboard at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});await page.clock.install({time:new Date('2026-09-11T12:00:00Z')});await setup(page);
  await render(page,[]);await expect(page.locator('.dv03-sign-layer')).toBeVisible();
  const library=award('Q000039',39,300),billboard=award('Q000006',4,1);
  await render(page,[library,billboard]);await expect(page.locator('.dv03-sign-layer')).toBeHidden();
  await expect(page.locator('#dv03-scene-layer')).toHaveAttribute('data-dv-scene','library');
  await page.evaluate(awards=>window.dispatchEvent(new CustomEvent('dv:drive-awarded',{detail:{driverId:'synthetic',driveId:'new-drive',awards}})),[library,billboard]);
  await expect(page.locator('.dv03-sign-layer')).toBeVisible();await expect(page.locator('#hours-sign')).toHaveText('Award Q000006');
  await page.clock.fastForward(12001);
  await expect(page.locator('.dv03-sign-layer')).toBeHidden();await expect(page.locator('#dv03-scene-layer')).toHaveAttribute('data-dv-scene','library');
  await page.locator('.dv03-windshield').screenshot({path:`test-results/bklg0128-resting-${width}.png`});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('dv:driver-changing',{detail:{}})));
  await expect(page.locator('.dv03-sign-layer')).toBeVisible();await expect(page.locator('#dv03-scene-layer')).not.toHaveAttribute('data-dv-scene');
});
test('sky changes with the driver timezone and clock without dashboard refresh',async({page})=>{
  await page.clock.install({time:new Date('2026-09-11T17:59:50Z')});await setup(page);await render(page,[award('Q000035',35,400)]);
  await expect(page.locator('.dv03-sky')).toHaveAttribute('data-dv-sky','day');await page.clock.fastForward(31000);
  await expect(page.locator('.dv03-sky')).toHaveAttribute('data-dv-sky','night');await expect(page.locator('#dv03-scene-layer')).toHaveAttribute('data-dv-scene','park');
  await render(page,[],'America/Detroit');await expect(page.locator('.dv03-sky')).toHaveAttribute('data-dv-sky','day');
});
test('operator harness exercises real resolver without database writes',async({page})=>{
  await page.route('**/auth/v1/**',route=>route.fulfill({json:{}}));
  await page.addInitScript(()=>{
    const model={ok:true,is_operator:true,drivers:[{id:'synthetic',display_name:'Synthetic',timezone:'UTC'}],driver_access:[{driver_id:'synthetic',mode:'VIEW'}],progress:[],vehicles:[],recent_drives:[],quest_awards:[],license_requirements:[],avatar_assignments:[]};
    window.__uatModel=model;
    window.DV_SUPABASE_CLIENT={auth:{getSession:async()=>({data:{session:{user:{id:'uat'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},rpc:async()=>({data:model}),functions:{invoke:async()=>({data:{ok:true}})}};
  });
  await page.goto('/log/DV03/staging/BKLG-0128/');
  await expect(page.locator('html')).toHaveAttribute('data-bklg0128-authorized','true');
  const frame=page.frameLocator('#uat-frame');await expect(frame.locator('.dv03-windshield')).toBeVisible();
  await frame.locator('#bklg0128-harness-slot').scrollIntoViewIfNeeded();
  for(const [scenario,scene,billboard] of [['none','none',true],['persistent','park',false],['scenery','library',false],['mixed','library',true],['order','library',true],['xp','library',true],['key','library',true]]){
    await page.locator(`[data-presentation-scenario="${scenario}"]`).click();
    await expect(frame.locator('#dv03-scene-layer')).toHaveAttribute('data-dv-scene',scene);
    if(billboard)await expect(frame.locator('.dv03-sign-layer')).toBeVisible();else await expect(frame.locator('.dv03-sign-layer')).toBeHidden();
  }
  await page.locator('[data-presentation-scenario="night"]').click();await expect(frame.locator('.dv03-sky')).toHaveAttribute('data-dv-sky','night');
  await page.locator('[data-presentation-scenario="day"]').click();await expect(frame.locator('.dv03-sky')).toHaveAttribute('data-dv-sky','day');
});

test('non-operator cannot load the UAT console or exercise its scenarios',async({page})=>{
  await page.addInitScript(()=>{window.DV_SUPABASE_CLIENT={auth:{getSession:async()=>({data:{session:{user:{id:'non-operator'}}}})},rpc:async()=>({data:{ok:true,is_operator:false}})}});
  await page.goto('/log/DV03/staging/BKLG-0128/');
  await expect(page.locator('#uat-denied')).toBeVisible();
  await expect(page.locator('#uat-shell')).toBeHidden();
  await expect(page.locator('#uat-frame')).not.toHaveAttribute('src');
});
