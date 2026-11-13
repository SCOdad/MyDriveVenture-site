const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const source=fs.readFileSync('assets/js/registration-review-guard.js','utf8')

async function simulate(pathname,search,canComplete,authenticated=true){
  let navigated=null
  const session=authenticated?{access_token:'test-session'}:null
  const location={pathname,search,replace(value){navigated=value}}
  const auth={getSession:async()=>({data:{session}}),onAuthStateChange(){}}
  const window={DV_APP_CONFIG:{supabaseUrl:'https://example.supabase.co',publishableKey:'test'},
    supabase:{createClient(){return{auth}}}}
  const fetch=async()=>({ok:true,json:async()=>({pending_reviews:[{
    review_id:'11111111-1111-4111-8111-111111111111',
    can_complete:canComplete
  }]})})
  vm.runInNewContext(source,{window,location,fetch,URLSearchParams,console:{warn(){}}})
  // Flush promise microtasks scheduled by the page-load auth lookup and request.
  await new Promise(resolve=>setImmediate(resolve))
  return navigated
}

test('linked grown-up entering Family Hub is redirected',async()=>{
  const url=await simulate('/family/','',true)
  assert.match(url,/^\/registration-review\/\?review=/)
})
test('driver entering Driver Console is redirected',async()=>{
  const url=await simulate('/log/','',false)
  assert.match(url,/^\/registration-review\/\?review=/)
})
test('driver may explicitly continue basic state-neutral practice',async()=>{
  assert.equal(await simulate('/log/','?continue_practice=1',false),null)
})
test('grown-up cannot bypass required review using practice query',async()=>{
  const url=await simulate('/log/','?continue_practice=1',true)
  assert.match(url,/^\/registration-review\/\?review=/)
})
test('signed-out user is not redirected',async()=>{
  assert.equal(await simulate('/log/','',true,false),null)
})
