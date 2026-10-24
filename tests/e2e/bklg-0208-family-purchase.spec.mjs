import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const script=fs.readFileSync('assets/js/commercial-purchase.js','utf8');
const html='<html><body><main><section id="dv-commercial-purchase" hidden></section></main></body></html>';
async function prepare(page,{enabled=false,testContext=false}={}){
 const calls=[];
 await page.route('https://purchase.test/**',async route=>{
  const req=route.request();
  if(req.method()==='GET')return route.fulfill({contentType:'text/html',body:html});
  const body=req.postDataJSON()||{};calls.push(body);
  let out={ok:true};
  if(req.url().endsWith('/family-api'))out={ok:true,family_contexts:[{family_id:'family',is_license_holder:true,license_holder_name:'Synthetic Holder',commercial_state:'FREE',driver_capacity:1}]};
  else if(body.action==='catalog')out={ok:true,checkout_enabled:enabled,disabled_reason:'Purchases disabled',offers:[{offer_code:'FAMILY_LICENSE',display_name:'Family License',unit_cents:2499}],billing_states:[{code:'MI',provisional:true}],...(testContext?{test_context:{family_id:'family'}}:{})};
  else if(body.action==='quote')out={ok:true,quote:{quote_id:'quote-test',family_id:'family',offer_code:'FAMILY_LICENSE',billing_state:'MI',currency:'USD',display_name:'Family License',subtotal_cents:2499,tax_cents:0,total_cents:2499,terms_version:'terms-2026-10-16',terms_digest:'digest',privacy_version:'privacy-2026-10-16',expires_at:new Date(Date.now()+3600000).toISOString()}};
  else if(body.action==='developer_initialize_test')out={ok:true,initialized:true,mode:'DEVELOPER_TEST',payment_initiated:false};
  else if(body.action==='developer_connection_test')out={ok:true,connected:true,mode:'DEVELOPER_TEST'};
  else if(body.action==='start')throw new Error('Tests must not create a payment session');
  await route.fulfill({json:out,headers:{'access-control-allow-origin':'*'}});
 });
 await page.goto('https://purchase.test/family/'+(testContext?'?dev_test_run=test-run&test_family=family':''));
 await page.evaluate(()=>{
  window.DV_APP_CONFIG={supabaseUrl:'https://purchase.test',publishableKey:'public-synthetic'};
  window.DV_ENVIRONMENT_CONFIG={name:'dev'};
  window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{access_token:'test-token'}}})}})};
 });
 await page.addScriptTag({content:script});
 await expect(page.locator('#dv-commercial-purchase')).toBeVisible();
 return calls;
}
test('paused purchases retain read-only Family UI, without payable controls',async({page})=>{
 await prepare(page);
 await expect(page.locator('#dv-buy-quote')).toBeDisabled();
 await expect(page.locator('#dv-buy-pay')).toBeDisabled();
 await expect(page.locator('#dv-buy-notice')).toContainText('Purchases disabled');
});
test('server quote displays amount and policies; user consent is necessary',async({page})=>{
 const calls=await prepare(page,{enabled:true});
 await page.selectOption('#dv-buy-offer','FAMILY_LICENSE');
 await page.selectOption('#dv-buy-state','MI');
 await page.click('#dv-buy-quote');
 await expect(page.locator('#dv-buy-summary')).toContainText('$24.99');
 await expect(page.locator('#dv-buy-summary')).toContainText('terms-2026-10-16');
 await expect(page.locator('#dv-buy-pay')).toBeDisabled();
 await page.check('#dv-buy-terms');
 await expect(page.locator('#dv-buy-pay')).toBeEnabled();
 expect(calls.some(x=>x.action==='quote'&&x.family_id==='family'&&x.billing_state==='MI')).toBeTruthy();
 expect(calls.some(x=>x.action==='start')).toBeFalsy();
});
test('scoped DEV enrollment is forwarded to purchase authority, without a submission',async({page})=>{
 const calls=await prepare(page,{enabled:true,testContext:true});
 expect(calls.some(x=>x.action==='catalog'&&x.dev_test_run_id==='test-run'&&x.family_id==='family')).toBeTruthy();
 await expect(page.locator('#dv-buy-pay')).toBeDisabled();
});
test('DEV diagnostics do not require Terms or initiate payment',async({page})=>{
 const calls=await prepare(page);
 await page.locator('[data-commercial-check="developer_initialize_test"]').first().click();
 await expect(page.locator('#dv-buy-diagnostic-result')).toContainText('initialized');
 expect(calls.some(x=>x.action==='start')).toBeFalsy();
});
