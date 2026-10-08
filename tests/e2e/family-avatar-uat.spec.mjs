import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
async function mount(page){
 await page.route('**/*',route=>route.abort());
 await page.setContent(fs.readFileSync('family/index.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,''));
 await page.addStyleTag({path:path.join(root,'assets/css/family.css')});
 await page.evaluate(()=>{
  const state=window.uat={count:2,submissions:[],avatarCalls:0,failAvatar:true};
  const drivers=()=>Array.from({length:state.count},(_,i)=>({id:`driver-${i}`,person_id:`person-${i}`,display_name:`UAT Driver ${i}`,family_id:'family',license_stage:'LEVEL_1',home_state:'MI'}));
  const session={access_token:'fixture'};
  window.DV_APP_CONFIG={supabaseUrl:'https://fixture.invalid',publishableKey:'public'};
  window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session}}),onAuthStateChange(){},signOut:async()=>({})}})};
  const ok=data=>({ok:true,json:async()=>({ok:true,...data})});
  window.fetch=async(url,init)=>{
   const body=JSON.parse(init.body),slug=url.split('/').pop();
   if(slug==='family-avatar-map'){
    state.avatarCalls++;if(state.failAvatar){state.failAvatar=false;throw Error('transient test failure')}
    return ok({avatars:Object.fromEntries(body.driver_ids.map(id=>[id,'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aHj8AAAAASUVORK5CYII=']))});
   }
   if(slug==='profile-api')return ok({subjects:[{kind:'PERSON',relation:'SELF',person_id:'holder'}]});
   if(slug==='driver-api')return ok({data:{drivers:drivers(),progress:[]}});
   if(slug==='family-invite-api')return ok({zero_access_grownups:[],pending_invitations:[]});
   if(slug==='family-api'){
    if(body.action==='add_driver'){state.submissions.push(body);await new Promise(r=>state.release=r);state.count++;return ok({driver_id:'driver-2',family_id:'family'})}
    if(body.action==='transfer_requests')return ok({incoming:[],outgoing:[]});
    return ok({current_person_id:'holder',license_holder_family_ids:['family'],family_contexts:[{family_id:'family',license_holder_person_id:'holder',license_holder_name:'UAT Parent',commercial_state:'PAID',entitlement_basis:'GRANDFATHERED_ALPHA',driver_count:state.count,driver_capacity:3,can_add_driver:state.count<3}],drivers:drivers(),grownups:[{person_id:'holder',display_name:'UAT Parent',family_ids:['family'],driver_ids:drivers().map(d=>d.id),is_license_holder:true},{person_id:'grownup',display_name:'Selected grown-up',family_ids:['family'],driver_ids:[]}],pending_invitations:[]});
   }
   throw Error(`Unexpected ${slug}`);
  };
 });
 await page.addScriptTag({path:path.join(root,'assets/js/family-avatar-map.js')});
 await page.addScriptTag({path:path.join(root,'assets/js/family.js')});
 await expect(page.locator('#family-app')).toBeVisible();
}
test('real browser recovers avatars and Add Driver prevents duplicate submissions at the three-driver boundary',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await mount(page);
 await expect(page.locator('[data-avatar-host] img')).toHaveCount(2);
 expect(await page.evaluate(()=>window.uat.avatarCalls)).toBe(2);
 await page.locator('#owned-family-actions [data-open-panel="driver"]').click();
 const form=page.locator('#add-driver-form');
 for(const [name,value] of Object.entries({name:'New UAT Driver',birth_date:'2010-01-01',home_zip:'48301',email:'new-driver@example.invalid',license_stage_start_date:'2026-09-01',vehicle_name:'UAT Car',prior_total_hours:'2',prior_night_hours:'2.3'}))await form.locator(`[name="${name}"]`).fill(value);
 await form.locator('[name="license_stage"]').evaluate(el=>el.add(new Option('Level 1','LEVEL_1')));
 await form.locator('[name="license_stage"]').selectOption('LEVEL_1');await form.locator('[name="vehicle_class"]').selectOption('Sedan');
 await expect(page.locator('#driver-status')).toContainText('Night hours cannot exceed');
 await form.dispatchEvent('submit');expect(await page.evaluate(()=>window.uat.submissions.length)).toBe(0);
 await form.locator('[name="prior_night_hours"]').fill('0.5');await form.locator('[name="guardian_person_id"][value="grownup"]').check();
 await form.dispatchEvent('submit');await form.dispatchEvent('submit');
 await expect(form.locator('button[type="submit"]')).toBeDisabled();
 expect(await page.evaluate(()=>window.uat.submissions.length)).toBe(1);
 expect(await page.evaluate(()=>window.uat.submissions[0])).toMatchObject({family_id:'family',prior_total_hours:'2',prior_night_hours:'0.5',guardian_person_ids:['grownup']});
 await page.evaluate(()=>window.uat.release());
 await expect(page.locator('.family-driver-card')).toHaveCount(3);
 await expect(page.locator('#owned-family-actions .family-driver-capacity-hint button')).toBeDisabled();
 await expect(page.locator('.family-driver-capacity-hint')).toHaveAttribute('title','Need more than 3 drivers? Contact mike@mydriveventure.com.');
 await expect(page.locator('.family-self-license-summary')).toContainText('ALPHA · 3 of 3 drivers');
 expect(errors).toEqual([]);
});
