import {test,expect} from '@playwright/test'

const DRIVER='11111111-1111-4111-8111-111111111111'
const FAMILY='22222222-2222-4222-8222-222222222222'

async function mockLifecycle(page,{driverStatus='ACTIVE',familyStatus='ACTIVE',
  driverPurge=false,familyTransitions=false,familyPurge=false}={}){
  let currentDriverStatus=driverStatus
  let calls=[]
  await page.route('**/assets/js/environment-config.js',r=>r.fulfill({
    contentType:'application/javascript',
    body:"window.DV_ENVIRONMENT_CONFIG={supabaseUrl:'https://dev.mock',publishableKey:'public-test',functionUrl:name=>'https://dev.mock/functions/v1/'+name};"
  }))
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',r=>r.fulfill({
    contentType:'application/javascript',
    body:"window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{access_token:'dev-test-token'}}}),refreshSession:async()=>({data:{session:{access_token:'dev-test-token'}}})}})};"
  }))
  await page.route('https://dev.mock/functions/v1/operator-lifecycle',async r=>{
    const input=JSON.parse(r.request().postData()||'{}')
    calls.push(input)
    if(input.action==='preview_driver'){
      return r.fulfill({contentType:'application/json',body:JSON.stringify({
        ok:true,kind:'driver',capabilities:{transition:true,purge:driverPurge},
        preview:{driver:{id:DRIVER,person_id:DRIVER,display_name:'Fixture Driver',status:currentDriverStatus},
          family_memberships:[{family_id:FAMILY}],guardian_relationships:[],
          direct_fk_dependencies:{'public.driver_progress.driver_id':{count:1,fk_on_delete:'c'}},
          simple_purge_candidate:currentDriverStatus==='INACTIVE',simple_purge_blockers:[],
          completeness:'DIRECT_FK_ONLY',safe_to_purge:false}
      })})
    }
    if(input.action==='transition_driver'){
      currentDriverStatus=input.transition==='INACTIVATE'?'INACTIVE':'ACTIVE'
      return r.fulfill({contentType:'application/json',body:JSON.stringify({
        ok:true,kind:'driver',result:{status:currentDriverStatus,audit_id:'audit-driver'}
      })})
    }
    if(input.action==='preview_family'){
      return r.fulfill({contentType:'application/json',body:JSON.stringify({
        ok:true,kind:'family',capabilities:{transition:familyTransitions,purge:familyPurge},
        preview:{family_id:FAMILY,family_code:'FAMILY-TEST',family_status:familyStatus,
          counts:{drivers:1,drives:0},shared_people:[],storage_objects:[]}
      })})
    }
    if(input.action==='purge_driver'||input.action==='purge_family'){
      return r.fulfill({contentType:'application/json',body:JSON.stringify({
        ok:true,kind:input.action==='purge_driver'?'driver':'family',
        result:{audit_id:'audit-purge',requires_companion_cleanup:input.action==='purge_family'}
      })})
    }
    return r.fulfill({status:400,contentType:'application/json',body:JSON.stringify({ok:false,error:'Unexpected action'})})
  })
  return calls
}

test('BKLG-0239 driver preview and guarded inactivation',async({page})=>{
  const calls=await mockLifecycle(page)
  await page.goto('/operator/lifecycle/')
  await page.locator('#lifecycle-id').fill(DRIVER)
  await page.getByRole('button',{name:'Preview impact'}).click()
  await expect(page.locator('#lifecycle-summary')).toContainText('Driver impact')
  await expect(page.locator('#driver-transition-panel')).toBeVisible()
  await expect(page.locator('#purge-panel')).toBeHidden()
  await page.locator('#driver-transition-confirm').fill('wrong')
  await page.locator('#driver-transition-reason').fill('Operator test reason')
  await page.locator('#driver-transition-submit').click()
  await expect(page.locator('#driver-transition-result')).toContainText('does not match')
  expect(calls.filter(x=>x.action==='transition_driver')).toHaveLength(0)
  await page.locator('#driver-transition-confirm').fill('Fixture Driver')
  await page.locator('#driver-transition-submit').click()
  await expect(page.locator('#lifecycle-status')).toContainText('Audit ID: audit-driver')
  await expect(page.locator('#selected-driver-status')).toContainText('INACTIVE')
  expect(calls.filter(x=>x.action==='transition_driver')).toHaveLength(1)
})

test('BKLG-0239 feature gates hide family and purge actions',async({page})=>{
  await mockLifecycle(page,{familyStatus:'INACTIVE',familyTransitions:false,familyPurge:false})
  await page.goto('/operator/lifecycle/')
  await page.locator('#lifecycle-kind').selectOption('family')
  await page.locator('#lifecycle-id').fill(FAMILY)
  await page.getByRole('button',{name:'Preview impact'}).click()
  await expect(page.locator('#lifecycle-summary')).toContainText('FAMILY-TEST')
  await expect(page.locator('#family-transition-panel')).toBeHidden()
  await expect(page.locator('#purge-panel')).toBeHidden()
})

test('BKLG-0239 purge requires matching ID, name, reason and explicit acknowledgment',async({page})=>{
  const calls=await mockLifecycle(page,{driverStatus:'INACTIVE',driverPurge:true})
  await page.goto('/operator/lifecycle/')
  await page.locator('#lifecycle-id').fill(DRIVER)
  await page.getByRole('button',{name:'Preview impact'}).click()
  await expect(page.locator('#purge-panel')).toBeVisible()
  await page.locator('#purge-id').fill(FAMILY)
  await page.locator('#purge-confirm').fill('Fixture Driver')
  await page.locator('#purge-reason').fill('Approved UAT cleanup fixture')
  await page.locator('#purge-acknowledge').check()
  await page.locator('#purge-submit').click()
  await expect(page.locator('#purge-result')).toContainText('Exact UUID')
  expect(calls.filter(x=>x.action==='purge_driver')).toHaveLength(0)
  await page.locator('#purge-id').fill(DRIVER)
  await page.locator('#purge-submit').click()
  await expect(page.locator('#lifecycle-status')).toContainText('Audit ID: audit-purge')
  expect(calls.filter(x=>x.action==='purge_driver')).toHaveLength(1)
})
