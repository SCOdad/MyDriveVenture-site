const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const entry=fs.readFileSync('assets/js/log-dashboard-entry-v5.js','utf8');

test('BKLG-0258: zero-driver return flow remains syntactically valid',()=>{
  assert.doesNotThrow(()=>new Function(entry));
});

test('BKLG-0258: returning grown-ups are routed only after authorized Family overview',()=>{
  assert.match(entry,/no active driver is linked to this account yet/i);
  assert.ok(entry.includes('/functions/v1/family-api'));
  assert.ok(entry.includes("action:'overview'"));
  assert.ok(entry.includes('family?.ok!==true'));
  assert.ok(entry.includes('!family.current_person_id'));
  assert.ok(entry.includes('!(family.family_contexts||[]).length'));
  assert.ok(entry.includes("location.replace('/family/')"));
});

test('BKLG-0258: driver dashboard errors are not otherwise swallowed',()=>{
  assert.ok(entry.includes('if(await routeZeroDriverGrownup(error))return;throw error'));
  assert.ok(entry.includes("client.rpc('get_authenticated_dashboard_v1')"));
});

test('BKLG-0258: simulated access flow routes authorized zero-driver grown-up, but not unauthorized accounts',async()=>{
  const {runInNewContext}=require('node:vm');
  async function scenario({claimOk=true,dashboardError='No active driver is linked to this account yet.',overviewOk=true,familyContexts=[{family_id:'family-1'}],currentPerson='guardian-1'}={}){
    const elements=new Map(),handlers={},requests=[],redirects=[];
    function elem(id){
      if(!elements.has(id))elements.set(id,{
        id,hidden:false,disabled:false,dataset:{},style:{setProperty(){}},
        classList:{add(){},remove(){}},addEventListener(ev,fn){handlers[id+':'+ev]=fn},
        querySelector(){return elem('nested')},setAttribute(){},appendChild(){},
        textContent:'',innerHTML:'',value:''
      });
      return elements.get(id);
    }
    const client={
      auth:{
        getSession:async()=>({data:{session:{access_token:'test-token'}}}),
        onAuthStateChange(_callback){},
        signOut:async()=>{}
      },
      rpc:async name=>{
        requests.push(name);
        if(name==='claim_authenticated_access_v1')return claimOk?{data:{ok:true}}:{error:{message:'Unauthorized'}};
        return dashboardError?{error:{message:dashboardError}}:{data:{ok:true,drivers:[]}};
      }
    };
    const document={
      getElementById:elem,querySelector:()=>null,
      createElement:()=>({...elem('created'),dataset:{}}),
      head:{appendChild(){}},body:{appendChild(){}},
      documentElement:{dataset:{dvRoute:'dv03'},toggleAttribute(){}}
    };
    const context={
      document,
      window:{DV_APP_CONFIG:{supabaseUrl:'https://example.invalid',publishableKey:'test-key'},supabase:{createClient:()=>client},location:{origin:'https://example.invalid'}},
      location:{origin:'https://example.invalid',replace:path=>redirects.push(path)},
      fetch:async(url,options)=>{
        requests.push('family-api');
        assert.match(url,/family-api$/);
        assert.equal(options.headers.authorization,'Bearer test-token');
        return{ok:overviewOk,json:async()=>({ok:overviewOk,family_contexts:familyContexts,current_person_id:currentPerson})};
      },
      setTimeout,Date,Promise,console:{warn(){}}
    };
    runInNewContext(entry,context);
    await new Promise(resolve=>setTimeout(resolve,35));
    return{redirects,requests,loginStatus:elem('login-status').textContent};
  }
  const authorized=await scenario();
  assert.deepEqual(authorized.redirects,['/family/']);
  assert.deepEqual(authorized.requests,['claim_authenticated_access_v1','get_authenticated_dashboard_v1','family-api']);
  for(const invalid of [
    {overviewOk:false},{familyContexts:[]},{currentPerson:null},
    {claimOk:false},{dashboardError:'Other backend error'}
  ]){
    const r=await scenario(invalid);
    assert.deepEqual(r.redirects,[],JSON.stringify(invalid));
    assert.match(r.loginStatus,/could not open/i);
    if(invalid.claimOk===false||invalid.dashboardError==='Other backend error')assert.ok(!r.requests.includes('family-api'));
  }
});
