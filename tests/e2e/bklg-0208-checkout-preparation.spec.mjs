import {test,expect} from '@playwright/test'
import fs from 'node:fs'
const html=fs.readFileSync('checkout/index.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,'')
const js=fs.readFileSync('assets/js/checkout.js','utf8')
async function prepare(page,enabled=false,failure=false,testMode=false){
  await page.route('**/*',async route=>{
    const url=route.request().url()
    if(!url.startsWith('https://checkout.test/'))return route.abort()
    if(route.request().method()==='GET')return route.fulfill({contentType:'text/html',body:html})
    const body=route.request().postDataJSON()
    if(testMode&&body.action==='catalog'){expect(body.dev_test_run_id).toBe('test-run');expect(body.family_id).toBe('family')}
    const result=url.endsWith('/family-api')?{ok:true,family_contexts:[{family_id:'family',is_license_holder:true,commercial_state:'FREE',license_holder_name:'Test',driver_capacity:1}]}:
      body.action==='catalog'?{ok:true,checkout_enabled:enabled,test_context:testMode?{family_id:'family',variant:'fee_saver',receipt_email:'drive+dev-payments@mydriveventure.com'}:null,disabled_reason:'Purchases are paused for verification.',billing_states:[{code:'MI',provisional:true}],offers:[{offer_code:'FAMILY_LICENSE',display_name:'Family License',unit_cents:2499}]}:
      {ok:true,initialized:!failure,mode:'DEVELOPER_TEST',payment_initiated:false,variant:body.variant,provider_http_status:failure?400:200,diagnostic:failure?{code:'FEE_SAVER_PAYMENT_METHODS',fields:[],guidance:'Check developer-account ACH availability.'}:null}
    await route.fulfill({json:result})
  })
  if(testMode)await page.goto('https://checkout.test/checkout/?dev_test_run=test-run&test_family=family')
  else await page.setContent(html)
  await page.addStyleTag({content:fs.readFileSync('assets/css/checkout.css','utf8')})
  await page.evaluate(()=>{
    window.DV_APP_CONFIG={supabaseUrl:'https://checkout.test',publishableKey:'synthetic'}
    window.DV_ENVIRONMENT_CONFIG={name:'dev'}
    window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{access_token:'synthetic'}}})}})}
  })
  await page.addScriptTag({content:js})
  await expect(page.locator('#checkout-app')).toBeVisible()
}
test('paused checkout explains disabled products and quotes; Michigan is explicit and not preselected',async({page})=>{
  await page.setViewportSize({width:390,height:844})
  await prepare(page)
  await expect(page.locator('input[name="offer"]')).toBeDisabled()
  await expect(page.locator('#checkout-offer-help')).toContainText('Selection is disabled')
  await expect(page.locator('#checkout-quote-help')).toContainText('Purchases are paused')
  await expect(page.locator('#checkout-state')).toHaveValue('')
  await page.selectOption('#checkout-state','MI')
  await expect(page.locator('#state-help')).toContainText('pending tax determination')
  await expect(page.locator('#checkout-quote')).toBeDisabled()
  await expect(page.locator('#checkout-pay')).toBeDisabled()
  await page.getByRole('button',{name:'Test Fee Saver initialization (no payment)',exact:true}).click()
  await expect(page.locator('#checkout-dev-result')).toContainText('Fee amounts and ACH settlement remain unverified')
  await expect(page.locator('#checkout-pay')).toBeDisabled()
})
test('unsupported state cannot enable a quote even if purchase flag is enabled in a synthetic fixture',async({page})=>{
  await prepare(page,true)
  await page.locator('input[name="offer"]').check()
  await page.selectOption('#checkout-state','UNAVAILABLE')
  await expect(page.locator('#checkout-quote')).toBeDisabled()
  await expect(page.locator('#checkout-quote-help')).toContainText('Other states are not available')
  await page.selectOption('#checkout-state','MI')
  await expect(page.locator('#checkout-quote')).toBeEnabled()
  await expect(page.locator('#checkout-pay')).toBeDisabled()
})

test('failed diagnostic shows safe reason without enabling product or consent',async({page})=>{
  await prepare(page,false,true)
  await expect(page.getByText('These checks run independently', {exact:false})).toBeVisible()
  await page.getByRole('button',{name:'Test Fee Saver initialization (no payment)',exact:true}).click()
  await expect(page.locator('#checkout-dev-result')).toContainText('FEE_SAVER_PAYMENT_METHODS')
  await expect(page.locator('#checkout-dev-result')).toContainText('No payment was started')
  await expect(page.locator('input[name="offer"]')).toBeDisabled()
  await expect(page.locator('#checkout-consent')).toBeDisabled()
  await expect(page.locator('#checkout-pay')).toBeDisabled()
})

test('isolated test context shows recipient and limits without starting payment',async({page})=>{
 await prepare(page,true,false,true)
 await expect(page.locator('#checkout-offer-help')).toContainText('drive+dev-payments@mydriveventure.com')
 await expect(page.locator('#checkout-offer-help')).toContainText('Maximum 6 submissions')
 await expect(page.locator('#checkout-family')).toHaveValue('family')
 await expect(page.locator('#checkout-pay')).toBeDisabled()
})
