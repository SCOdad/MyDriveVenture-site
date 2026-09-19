import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { personas, signIn, installPageGuards } from './helpers.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const asset=relative=>path.join(root,relative);

async function mountFamilyFixture(page,{driverCount=5,familyDriverCount=driverCount}={}){
  await page.setViewportSize({width:1100,height:900});
  await page.setContent(`<!doctype html><html><body>
    <main>
      <section id="family-loading"><p>Loading…</p></section>
      <section id="family-auth-needed" hidden><p></p></section>
      <div id="family-app" hidden>
        <button id="family-sign-out" type="button">Log out</button>
        <button type="button" data-open-panel="driver">+ Add driver</button>
        <button type="button" data-open-panel="grownup">+ Add grown-up</button>
        <div id="family-drivers" class="family-driver-grid"></div>
        <button id="family-see-all-drivers" type="button" hidden aria-controls="family-drivers" aria-expanded="false">See all drivers</button>
        <div id="family-grownups"></div><div id="family-pending-invites"></div>
        <section id="grownup-panel" hidden><form id="grownup-email-form"><input name="email"></form><form id="add-grownup-form" hidden><input id="grownup-confirmed-email" name="email"><div id="new-grownup-fields"><input name="name"></div><div id="grownup-account-result"></div><div id="grownup-driver-scope"></div><div id="grownup-lookup-status"></div><div id="grownup-status"></div></form></section>
        <section id="driver-panel" hidden><form id="add-driver-form"><input name="name" value="First Driver"><input name="birth_date" value="2010-01-01"><input name="home_zip" value="48301"><input name="email" value="driver@fixture.invalid"><input name="mobile" value=""><input name="license_stage" value="LEVEL_1"><input name="license_stage_start_date" value="2026-09-01"><input name="favorite_color" value="GREEN"><input name="vehicle_name" value="Test Car"><input name="vehicle_class" value="Sedan"><input name="vehicle_color" value="Gray"><div id="driver-status"></div><button type="submit">Add driver</button></form></section>
      </div>
    </main>
  </body></html>`);
  await page.addStyleTag({path:asset('assets/css/family.css')});
  await page.evaluate(({driverCount,familyDriverCount})=>{
    const ids=n=>Array.from({length:n},(_,i)=>`driver-${i+1}`);
    const driverRows=n=>ids(n).map((id,i)=>({id,person_id:`person-${i+1}`,display_name:`Driver ${i+1}`,license_stage:i%2?'LEVEL_2':'LEVEL_1',favorite_color:['GREEN','BLUE','PINK','ORANGE','PURPLE'][i%5]}));
    const state={count:driverCount,familyDriverCount};
    window.__familyFixture=state;
    window.DV_APP_CONFIG={supabaseUrl:'https://dev.fixture.invalid',publishableKey:'fixture-key'};
    window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{access_token:'fixture-token'}}}),signOut:async()=>({}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};
    window.fetch=async(url,options={})=>{
      const body=JSON.parse(options.body||'{}');
      const n=state.count,drivers=driverRows(n),driverIds=drivers.map(d=>d.id);
      const response=data=>({ok:data.ok!==false,status:data.ok===false?404:200,json:async()=>data});
      if(String(url).includes('/family-api')){
        if(body.action==='add_driver'){state.count=1;state.familyDriverCount=Math.max(1,state.familyDriverCount);return response({ok:true});}
        return response({ok:true,family_id:'family-1',current_person_id:'grownup-1',family_driver_count:state.familyDriverCount,primary_driver_ids:driverIds,drivers:drivers.map(({favorite_color,...d})=>d),grownups:[{person_id:'grownup-1',display_name:'Fixture Grown-up',relationship:'PARENT',is_primary:n>0,driver_ids:driverIds}]});
      }
      if(String(url).includes('/family-invite-api'))return response({ok:true,zero_access_grownups:[],pending_invitations:[]});
      if(String(url).includes('/driver-api'))return response({ok:true,data:{drivers,progress:driverIds.map((id,i)=>({driver_id:id,total_minutes:600+i*60,night_minutes:120+i*15}))}});
      if(String(url).includes('/driver-hero-url'))return response({ok:false,error:'No current avatar'});
      throw new Error(`Unexpected fixture request: ${url}`);
    };
  },{driverCount,familyDriverCount});
  await page.addScriptTag({path:asset('assets/js/driver-palettes.js')});
  await page.addScriptTag({path:asset('assets/js/family.js')});
  await expect(page.locator('#family-app')).toBeVisible();
}

test.describe('BKLG-0198 Family Hub deterministic browser contract',()=>{
  test('real DEV multi-driver guardian loads Family Hub through authenticated contracts',async({page})=>{
    const assertNoPageFailures=installPageGuards(page);
    await signIn(page,personas.guardianMulti);
    await page.goto('/family/');
    await expect(page.locator('#family-app')).toBeVisible({timeout:20_000});
    await expect(page.locator('.family-driver-card')).toHaveCount(2,{timeout:20_000});
    await expect(page.locator('.family-grownup-card')).toHaveCount(1);
    await expect(page.locator('.family-driver-stats').first()).toContainText('Practice');
    await expect(page.locator('#family-see-all-drivers')).toBeHidden();
    assertNoPageFailures();
  });

  test('five drivers render as three-card summary with See all',async({page})=>{
    await mountFamilyFixture(page,{driverCount:5});
    const cards=page.locator('.family-driver-card');
    await expect(cards).toHaveCount(5);
    await expect(page.locator('.family-driver-card:visible')).toHaveCount(3);
    const seeAll=page.locator('#family-see-all-drivers');
    await expect(seeAll).toBeVisible();
    await expect(seeAll).toHaveText('See all 5 drivers');
    await seeAll.click();
    await expect(page.locator('.family-driver-card:visible')).toHaveCount(5);
    await expect(seeAll).toHaveText('Show less');
    await expect(seeAll).toHaveAttribute('aria-expanded','true');
    await seeAll.click();
    await expect(page.locator('.family-driver-card:visible')).toHaveCount(3);
    const firstBox=await cards.first().boundingBox();
    expect(firstBox).not.toBeNull();
    expect(firstBox.height).toBeGreaterThan(firstBox.width);
  });

  test('driver cards use canonical palette accents and restrained progress summary',async({page})=>{
    await mountFamilyFixture(page,{driverCount:2});
    const first=page.locator('.family-driver-card').first();
    await expect(first).toContainText('Driver 1');
    await expect(first).toContainText('Level 1');
    await expect(first).toContainText('10.0 hrs');
    await expect(first).toContainText('2.0 hrs');
    await expect(first).toHaveClass(/has-driver-accent/);
    expect(await first.getAttribute('style')).toContain('--family-accent-base:');
    await expect(first.locator('.family-parker-silhouette')).toBeVisible();
  });

  test('zero visible drivers is not misrepresented when the family already has drivers',async({page})=>{
    await mountFamilyFixture(page,{driverCount:0,familyDriverCount:2});
    await expect(page.locator('.family-no-shared-drivers')).toContainText('No drivers are currently shared with you');
    await expect(page.locator('.family-first-driver')).toHaveCount(0);
    await expect(page.locator('[data-open-panel="grownup"]')).toBeDisabled();
  });

  test('zero-driver family invites the first driver and disables grown-up invite',async({page})=>{
    await mountFamilyFixture(page,{driverCount:0});
    await expect(page.locator('.family-first-driver')).toContainText('Add your first driver');
    await expect(page.locator('[data-open-panel="grownup"]')).toBeDisabled();
    await page.locator('.family-first-driver [data-open-panel="driver"]').click();
    await expect(page.locator('#driver-panel')).toBeVisible();
    await page.locator('#add-driver-form').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
    await expect(page.locator('.family-driver-card')).toHaveCount(1);
    await expect(page.locator('.family-first-driver')).toHaveCount(0);
    await expect(page.locator('[data-open-panel="grownup"]')).toBeEnabled();
  });
});
