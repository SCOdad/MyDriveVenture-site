import {test,expect} from '@playwright/test'
const FAMILY='22222222-2222-4222-8222-222222222222'

test('BKLG-0239 family status flow requires matching code',async({page})=>{
  let familyStatus='ACTIVE'
  const calls=[]
  await page.route('**/assets/js/environment-config.js',r=>r.fulfill({
    contentType:'application/javascript',
    body:"window.DV_ENVIRONMENT_CONFIG={supabaseUrl:'https://dev.mock',publishableKey:'public-test',functionUrl:name=>'https://dev.mock/functions/v1/'+name};"
  }))
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',r=>r.fulfill({
    contentType:'application/javascript',
    body:"window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{access_token:'dev-test-token'}}}),refreshSession:async()=>({data:{session:{access_token:'dev-test-token'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};"
  }))
  await page.route('https://dev.mock/functions/v1/operator-lifecycle',async r=>{
    const body=JSON.parse(r.request().postData()||'{}')
    calls.push(body)
    if(body.action==='authorize')return r.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,authorized:true})})
    if(body.action==='transition_family')familyStatus=body.transition==='INACTIVATE'?'INACTIVE':'ACTIVE'
    await r.fulfill({contentType:'application/json',body:JSON.stringify(
      body.action==='preview_family'
        ? {ok:true,kind:'family',capabilities:{transition:true,purge:false},
           preview:{family_id:FAMILY,family_code:'FAMILY-TEST',family_status:familyStatus,
                    shared_people:[],storage_objects:[],counts:{drivers:1}}}
        : {ok:true,kind:'family',result:{status:familyStatus,audit_id:'audit-family'}}
    )})
  })
  await page.goto('/operator/lifecycle/')
  await page.locator('#lifecycle-kind').selectOption('family')
  await page.locator('#lifecycle-id').fill(FAMILY)
  await page.getByRole('button',{name:'Preview impact'}).click()
  await expect(page.locator('#family-transition-panel')).toBeVisible()
  await page.locator('#family-transition-confirm').fill('wrong')
  await page.locator('#family-transition-reason').fill('Synthetic family test')
  await page.locator('#family-transition-submit').click()
  await expect(page.locator('#family-transition-result')).toContainText('does not match')
  expect(calls.filter(x=>x.action==='transition_family')).toHaveLength(0)
  await page.locator('#family-transition-confirm').fill('FAMILY-TEST')
  await page.locator('#family-transition-submit').click()
  await expect(page.locator('#selected-family-status')).toHaveText('INACTIVE')
  await page.locator('#family-transition-confirm').fill('FAMILY-TEST')
  await page.locator('#family-transition-reason').fill('Synthetic family restore')
  await page.locator('#family-transition-submit').click()
  await expect(page.locator('#selected-family-status')).toHaveText('ACTIVE')
  expect(calls.filter(x=>x.action==='transition_family')).toHaveLength(2)
})

test('BKLG-0239 unauthenticated browser never exposes lifecycle controls',async({page})=>{
 await page.route('**/assets/js/environment-config.js',r=>r.fulfill({
   contentType:'application/javascript',
   body:"window.DV_ENVIRONMENT_CONFIG={supabaseUrl:'https://dev.mock',publishableKey:'public-test',functionUrl:name=>'https://dev.mock/functions/v1/'+name};"
 }))
 await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',r=>r.fulfill({
   contentType:'application/javascript',
   body:"window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};"
 }))
 await page.goto('/operator/lifecycle/')
 await expect(page.locator('#lifecycle-app')).toBeHidden()
 await expect(page.locator('#lifecycle-auth-gate')).toBeVisible()
 await expect(page.locator('#lifecycle-signin-link')).toBeVisible()
 await expect(page.locator('#lifecycle-auth-message')).toContainText('Sign in')
})

test('BKLG-0239 valid non-operator session still never reveals page',async({page})=>{
 await page.route('**/assets/js/environment-config.js',r=>r.fulfill({
   contentType:'application/javascript',
   body:"window.DV_ENVIRONMENT_CONFIG={supabaseUrl:'https://dev.mock',publishableKey:'public-test',functionUrl:name=>'https://dev.mock/functions/v1/'+name};"
 }))
 await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',r=>r.fulfill({
   contentType:'application/javascript',
   body:"window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{access_token:'not-an-operator'}}}),refreshSession:async()=>({data:{session:{access_token:'not-an-operator'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};"
 }))
 await page.route('https://dev.mock/functions/v1/operator-lifecycle',r=>r.fulfill({
   status:403,contentType:'application/json',body:JSON.stringify({ok:false,error:'Operator access required'})
 }))
 await page.goto('/operator/lifecycle/')
 await expect(page.locator('#lifecycle-app')).toBeHidden()
 await expect(page.locator('#lifecycle-auth-gate')).toBeVisible()
 await expect(page.locator('#lifecycle-auth-message')).toContainText('Access denied')
})

test('BKLG-0239 visitor requests magic link on lifecycle page and returns here',async({page})=>{
  await page.route('**/assets/js/environment-config.js',r=>r.fulfill({
    contentType:'application/javascript',
    body:"window.DV_ENVIRONMENT_CONFIG={supabaseUrl:'https://dev.mock',publishableKey:'public-test',functionUrl:name=>'https://dev.mock/functions/v1/'+name};"
  }));
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',r=>r.fulfill({
    contentType:'application/javascript',
    body:"window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),signInWithOtp:async args=>{window.lastMagicLinkRequest=args;return {error:null}},onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};"
  }));
  await page.goto('/operator/lifecycle/');
  await expect(page.locator('#lifecycle-app')).toBeHidden();
  await expect(page.locator('#lifecycle-signin')).toBeVisible();
  await page.locator('#lifecycle-signin-email').fill('operator@example.test');
  await page.getByRole('button',{name:'Send sign-in link'}).click();
  await expect(page.locator('#lifecycle-signin-status')).toContainText('Check your email');
  const request=await page.evaluate(()=>window.lastMagicLinkRequest);
  expect(request.email).toBe('operator@example.test');
  expect(request.options.shouldCreateUser).toBe(false);
  expect(request.options.emailRedirectTo).toContain('/log/?return=%2Foperator%2Flifecycle%2F');
  await expect(page.locator('#lifecycle-app')).toBeHidden();
});
