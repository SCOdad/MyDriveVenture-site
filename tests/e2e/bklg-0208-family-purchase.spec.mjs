import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const script=fs.readFileSync('assets/js/commercial-purchase.js','utf8');
const siteCss=['assets/css/site.css','assets/css/join.css','assets/css/family.css'].map(p=>fs.readFileSync(p,'utf8')).join('\n');
const css=fs.readFileSync('assets/css/commercial-purchase.css','utf8');
async function prepare(page,{enabled=true,state='FREE',contexts,denied=false,quotePatch={},status='PENDING',startFailure=false,pending=null,recoveryStatus='SESSION_CREATED',recoveryReason='SESSION_STILL_PROTECTED'}={}){
 const calls=[];let resolveQuote;let currentPending=pending;
 await page.route('https://purchase.test/**',async route=>{
  const req=route.request();
  if(req.method()==='GET')return route.fulfill({contentType:req.url().includes('.css')?'text/css':'text/html',body:req.url().includes('.css')?css:'<html><head></head><body><main><section id="dv-commercial-purchase" hidden></section></main></body></html>'});
  const b=req.postDataJSON();calls.push(b);let out={ok:true},code=state==='PAID'?'ADDITIONAL_DRIVER_CAPACITY':'FAMILY_LICENSE';
  if(req.url().endsWith('/family-api'))out={ok:true,family_contexts:contexts||[{family_id:'family',is_license_holder:true,commercial_state:state,driver_count:state==='PAID'?3:1,driver_capacity:state==='PAID'?3:1}]};
  else if(b.action==='catalog'){
   if(denied||b.family_id!=='family')return route.fulfill({status:403,json:{ok:false,error:'Only this Family’s authorized License Holder can purchase'}});
   out={ok:true,family_id:b.family_id,commercial_state:state,checkout_enabled:enabled,pending_purchase:currentPending,disabled_reason:'Purchases are paused.',offers:[{offer_code:code,currency:'USD',unit_cents:code==='FAMILY_LICENSE'?2499:999}],billing_states:[{code:'MI'}]};
  }else if(b.action==='quote')out={ok:true,quote:{quote_id:'quote',family_id:b.family_id,offer_code:code,billing_state:'MI',currency:'USD',subtotal_cents:code==='FAMILY_LICENSE'?2499:999,tax_cents:0,total_cents:code==='FAMILY_LICENSE'?2499:999,terms_version:'terms-2026-10-16',terms_digest:'terms-digest',privacy_version:'privacy-2026-10-16',privacy_digest:'privacy-digest',expires_at:new Date(Date.now()+600000).toISOString(),...quotePatch}};
  else if(b.action==='start'){
   if(startFailure)return route.fulfill({status:503,json:{ok:false,error:'Uncertain provider response'}});
   out={ok:true,purchase_id:'purchase',checkout_token:'synthetic-token'};
  }else if(b.action==='status')out={ok:true,status};
  else if(b.action==='recover-abandoned'){
   out={ok:true,status:recoveryStatus,recovery:recoveryReason,safe_after:new Date(Date.now()+300000).toISOString()};
   if(recoveryStatus==='ABANDONED')currentPending=null;
  }
  await route.fulfill({json:out});
 });
 await page.goto('https://purchase.test/family/?dev_test_run=old-run&test_family=old-family');
 await page.evaluate(()=>{
  window.DV_APP_CONFIG={supabaseUrl:'https://purchase.test',publishableKey:'synthetic'};
  window.DV_ENVIRONMENT_CONFIG={name:'dev'};
  window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{access_token:'synthetic'}}})}})};
  window.providerCalls=[];window.appendHelcimPayIframe=token=>window.providerCalls.push(token);
  window.fulfillments=[];window.addEventListener('dv:commercial-fulfilled',e=>window.fulfillments.push(e.detail));
 });
 await page.addStyleTag({content:siteCss});
 await page.addScriptTag({content:script});
 await expect(page.locator('#dv-commercial-purchase')).toBeVisible();
 return calls;
}
async function quote(page){await page.getByRole('button',{name:'Upgrade to add driver'}).click();await expect(page.locator('[data-summary]')).toContainText('$24.99');}
test('paused purchasing shows one disabled contextual control, no permanent form or diagnostics',async({page})=>{
 await prepare(page,{enabled:false});await expect(page.getByRole('button',{name:'Upgrade to add driver'})).toBeEnabled();
 await expect(page.locator('select,input,dialog')).toHaveCount(0);await expect(page.locator('#dv-commercial-purchase')).toContainText('DEV preview only — purchases paused.');
});
for(const state of ['FREE','FREE_EXHAUSTED','PAID'])test(`${state} gets its single server-eligible action`,async({page})=>{
 const calls=await prepare(page,{state});await expect(page.getByRole('button',{name:'Upgrade to add driver'})).toBeEnabled();
 expect(calls.some(c=>c.dev_test_run_id||c.family_id==='old-family')).toBeFalsy();
});
test('server supplies jurisdiction automatically; explicit consent binds a fresh quote',async({page})=>{
 const calls=await prepare(page);await page.getByRole('button',{name:'Upgrade to add driver'}).click();
 await expect(page.locator('[data-state]')).toHaveCount(0);
 await expect(page.locator('[data-summary]')).toContainText('$24.99');await expect(page.locator('[data-pay]')).toBeDisabled();
 await page.locator('[data-consent]').check();await expect(page.locator('[data-pay]')).toBeEnabled();
 await page.locator('[data-pay]').dblclick({force:true}).catch(()=>{});
 await expect.poll(()=>calls.filter(c=>c.action==='start').length).toBe(1);
 expect(calls.find(c=>c.action==='start')).toMatchObject({family_id:'family',accept_terms:true,accepted_terms_version:'terms-2026-10-16'});
});
test('cancel clears consent and reopening requests a new quote',async({page})=>{
 const calls=await prepare(page);await quote(page);await page.locator('[data-consent]').check();await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await quote(page);await expect(page.locator('[data-consent]')).not.toBeChecked();expect(calls.filter(c=>c.action==='quote')).toHaveLength(2);expect(calls.some(c=>c.action==='start')).toBeFalsy();
});
for(const patch of [{family_id:'other'},{privacy_digest:null},{expires_at:'invalid'},{expires_at:'2020-01-01'},{total_cents:2500}])test(`rejects malformed or stale quote ${JSON.stringify(patch)}`,async({page})=>{
 await prepare(page,{quotePatch:patch});await page.getByRole('button',{name:'Upgrade to add driver'}).click();
 await expect(page.locator('[data-notice]')).toContainText('could not be verified');await expect(page.locator('[data-consent]')).toBeDisabled();await expect(page.locator('[data-pay]')).toBeDisabled();
});
test('mixed-family access does not confer purchase authority',async({page})=>{
 await prepare(page,{contexts:[{family_id:'other',is_license_holder:false},{family_id:'family',is_license_holder:true,driver_count:1,driver_capacity:1}]});await expect(page.getByRole('button',{name:'Upgrade to add driver'})).toBeEnabled();
 const error=await page.evaluate(()=>window.DVCommercialPurchase.open({family_id:'other'}).catch(e=>e.message));expect(error).toContain('License Holder');
});
test('duplicate holder assignments fail closed instead of offering multiple purchase buttons',async({page})=>{
 await prepare(page,{contexts:[{family_id:'family',is_license_holder:true,commercial_state:'FREE'},{family_id:'other',is_license_holder:true,commercial_state:'PAID'}]});
 await expect(page.locator('#dv-commercial-purchase')).toContainText('assigned as License Holder for multiple Families');
 await expect(page.locator('#dv-commercial-purchase button')).toHaveCount(0);
 await expect(page.locator('#dv-commercial-purchase select')).toHaveCount(0);
 expect(await page.evaluate(()=>window.DVCommercialPurchase.open().catch(e=>e.message))).toContain('specific Family');
});
test('backend denial defeats a claimed holder context',async({page})=>{
 await prepare(page,{denied:true});await expect(page.locator('#dv-commercial-purchase')).toContainText('authorized License Holder');await expect(page.locator('button')).toHaveCount(0);
});
test('browser success does not fulfill a pending payment; reopening cannot resubmit',async({page})=>{
 const calls=await prepare(page);await quote(page);await page.locator('[data-consent]').check();await page.locator('[data-pay]').click();
 await expect.poll(()=>page.evaluate(()=>window.providerCalls.length)).toBe(1);
 await page.evaluate(()=>window.dispatchEvent(new MessageEvent('message',{data:{eventName:'helcim-pay-js-synthetic-token',eventStatus:'SUCCESS'}})));
 await expect(page.locator('dialog')).toBeVisible();await expect(page.locator('[data-pay]')).toBeDisabled();expect(await page.evaluate(()=>window.fulfillments)).toEqual([]);expect(calls.filter(c=>c.action==='start')).toHaveLength(1);
});
test('server fulfillment emits one Family refresh event',async({page})=>{
 await prepare(page,{status:'FULFILLED'});await quote(page);await page.locator('[data-consent]').check();await page.locator('[data-pay]').click();
 await expect.poll(()=>page.evaluate(()=>window.fulfillments)).toEqual([{family_id:'family',purchase_id:'purchase'}]);await expect(page.locator('dialog')).not.toBeVisible();
});
for(const status of ['DECLINED','ABANDONED','RECONCILIATION_REQUIRED'])test(`${status} cannot be presented as success`,async({page})=>{
 await prepare(page,{status});await quote(page);await page.locator('[data-consent]').check();await page.locator('[data-pay]').click();await expect(page.locator('[data-notice]')).toContainText('not confirmed');expect(await page.evaluate(()=>window.fulfillments)).toEqual([]);
});
test('uncertain start remains locked against a second purchase',async({page})=>{
 const calls=await prepare(page,{startFailure:true});await quote(page);await page.locator('[data-consent]').check();await page.locator('[data-pay]').click();await expect(page.locator('[data-notice]')).toContainText('Uncertain');await expect(page.locator('[data-pay]')).toBeDisabled();expect(calls.filter(c=>c.action==='start')).toHaveLength(1);
});
test('shared launcher works without Hub host and fits mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});await prepare(page);await page.evaluate(()=>document.getElementById('dv-commercial-purchase').remove());
 await page.evaluate(()=>window.DVCommercialPurchase.open({family_id:'family'}));await expect(page.locator('dialog')).toBeVisible();
 expect(await page.locator('dialog').evaluate(e=>e.getBoundingClientRect().width)).toBeLessThanOrEqual(390);
 await page.keyboard.press('Escape');await expect(page.locator('dialog')).not.toBeVisible();
});

test('existing unresolved server payment blocks a new session after reload',async({page})=>{
 await prepare(page,{pending:{id:'existing',status:'SESSION_CREATED'}});await expect(page.getByRole('button',{name:'Upgrade to add driver'})).toBeDisabled();
 expect(await page.evaluate(()=>window.DVCommercialPurchase.open({family_id:'family'}).catch(e=>e.message))).toContain('existing Family payment');
});
test('popup never requests a browser-entered billing state',async({page})=>{
 const calls=await prepare(page);
 await page.getByRole('button',{name:'Upgrade to add driver'}).click();
 await expect(page.locator('[data-state]')).toHaveCount(0);
 await expect(page.locator('[data-summary]')).toContainText('$24.99');
 expect(calls.find(c=>c.action==='quote')).not.toHaveProperty('billing_state');
});
test('repeated launcher open preserves popup and quote',async({page})=>{
 await prepare(page);await quote(page);await page.evaluate(()=>window.DVCommercialPurchase.open({family_id:'family'}));await expect(page.locator('[data-summary]')).toContainText('$24.99');await page.locator('[data-consent]').check();await expect(page.locator('[data-pay]')).toBeEnabled();
 await page.screenshot({path:'/tmp/bklg0208-popup.png'});
});

test('paid Family popup independently quotes upgrade; no payment starts without confirmation',async({page})=>{
 const calls=await prepare(page,{state:'PAID'});
 await page.getByRole('button',{name:'Upgrade to add driver'}).click();
 await expect(page.locator('dialog')).toBeVisible();
 await expect(page.locator('[data-description]')).toContainText('one more driver');
 
 await expect(page.locator('[data-summary]')).toContainText('$9.99');
 await expect(page.locator('[data-pay]')).toBeDisabled();
 expect(calls.some(x=>x.action==='start')).toBeFalsy();
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await expect(page.locator('dialog')).not.toBeVisible();
});

test('DEV paused Family purchase opens read-only popup with no quote or payment API calls',async({page})=>{
 const calls=await prepare(page,{enabled:false,state:'PAID'});
 await page.getByRole('button',{name:'Upgrade to add driver'}).click();
 await expect(page.locator('dialog')).toBeVisible();
 await expect(page.locator('[data-summary]')).toContainText('$9.99');
 await expect(page.locator('[data-summary]')).toContainText('base price only');
 await expect(page.locator('[data-notice]')).toContainText('DEV visual preview only');
 await expect(page.locator('[data-pay]')).toBeDisabled();
 await expect(page.locator('[data-consent]')).toBeDisabled();
 expect(calls.filter(c=>['quote','start','status'].includes(c.action))).toHaveLength(0);
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await expect(page.locator('dialog')).not.toBeVisible();
});

test('quoted payment breakdown uses individual rows and emphasizes server total',async({page})=>{
 await prepare(page,{quotePatch:{subtotal_cents:2499,tax_cents:175,total_cents:2674}});
 await page.getByRole('button',{name:'Upgrade to add driver'}).click();
 await expect(page.locator('.commercial-price-row')).toHaveCount(3);
 await expect(page.locator('.commercial-price-row').nth(0)).toContainText('Full Family License');
 await expect(page.locator('.commercial-price-row').nth(0)).toContainText('$24.99');
 await expect(page.locator('.commercial-tax')).toContainText('$1.75');
 await expect(page.locator('.commercial-total')).toContainText('$26.74');
 const total=await page.locator('.commercial-total strong').evaluate(e=>Number.parseFloat(getComputedStyle(e).fontSize));
 const subtotal=await page.locator('.commercial-price-row strong').first().evaluate(e=>Number.parseFloat(getComputedStyle(e).fontSize));
 expect(total).toBeGreaterThan(subtotal);
});
test('status button shows immediate feedback while background polling exists',async({page})=>{
 const calls=await prepare(page);
 await quote(page);await page.locator('[data-consent]').check();await page.locator('[data-pay]').click();
 await expect.poll(()=>page.evaluate(()=>window.providerCalls.length)).toBe(1);
 await page.evaluate(()=>window.dispatchEvent(new MessageEvent('message',{data:{eventName:'helcim-pay-js-synthetic-token',eventStatus:'HIDE'}})));
 await expect(page.locator('dialog')).toBeVisible();
 await page.getByRole('button',{name:'Check payment status'}).click();
 await expect(page.locator('[data-notice]')).toContainText('still protected');
 expect(calls.filter(c=>c.action==='recover-abandoned')).toHaveLength(1);
 expect(calls.filter(c=>c.action==='start')).toHaveLength(1);
});
test('expired checkout confirmation enables a new quote but never starts payment automatically',async({page})=>{
 const calls=await prepare(page,{pending:{id:'existing',status:'SESSION_CREATED'},recoveryStatus:'ABANDONED',recoveryReason:'EXPIRED_NO_PROVIDER_ACTIVITY'});
 await page.getByRole('button',{name:'Check previous checkout'}).click();
 await expect(page.getByRole('button',{name:'Upgrade to add driver'})).toBeEnabled();
 expect(calls.filter(c=>c.action==='start')).toHaveLength(0);
});
test('Helcim payment activity cannot be mistaken for an abandoned session',async({page})=>{
 const calls=await prepare(page,{pending:{id:'existing',status:'SESSION_CREATED'},recoveryReason:'PROVIDER_ACTIVITY_REQUIRES_REVIEW'});
 await page.getByRole('button',{name:'Check previous checkout'}).click();
 await expect(page.locator('#dv-commercial-purchase')).toContainText('Checkout remains locked for review');
 await expect(page.getByRole('button',{name:'Upgrade to add driver'})).toBeDisabled();
 expect(calls.filter(c=>c.action==='start')).toHaveLength(0);
});
test('new unpaid Family prioritizes first Add Driver before the commercial offer',async({page})=>{
 const calls=[];
 await page.route('https://first-driver.test/**',async route=>{
  const b=route.request().postDataJSON?.()||{};
  calls.push(b);
  const body=b.action==='overview'?{ok:true,family_contexts:[{family_id:'family',is_license_holder:true,commercial_state:'FREE',driver_count:0,driver_capacity:1}]}:{ok:true};
  await route.fulfill({json:body});
 });
 await page.goto('https://first-driver.test/family/');
 await page.evaluate(()=>{
  window.DV_APP_CONFIG={supabaseUrl:'https://first-driver.test',publishableKey:'synthetic'};
  window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{access_token:'synthetic'}}})}})};
 });
 await page.addScriptTag({content:script});
 await expect(page.locator('#dv-commercial-purchase')).toBeHidden();
 expect(calls.some(c=>c.action==='catalog')).toBeFalsy();
});
