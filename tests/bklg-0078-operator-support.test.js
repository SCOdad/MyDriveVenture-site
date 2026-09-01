const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

function source(path){return fs.readFileSync(path,'utf8')}


function syntaxChecks(){
  [
    'assets/js/log-dashboard-entry-v5.js',
    'assets/js/log-avatar.js',
    'assets/js/log-operator-support.js',
    'assets/js/log-drive-rpc.js',
    'assets/js/log-drive-detail-v4.js',
    'assets/js/log-prepilot-v2.js',
    'assets/js/log-shared-actions.js',
    'assets/js/log-game-polish.js',
    'assets/js/canonical-header.js'
  ].forEach(path=>assert.doesNotThrow(()=>new vm.Script(source(path),{filename:path}),path+' must parse'));
}

function architectureChecks(){
  const operator=source('assets/js/log-operator-support.js');
  const detail=source('assets/js/log-drive-detail-v4.js');
  const dashboard=source('assets/js/log-dashboard-entry-v5.js');
  const avatar=source('assets/js/log-avatar.js');
  const driveRpc=source('assets/js/log-drive-rpc.js');
  const shared=source('assets/js/log-shared-actions.js');
  const prepilot=source('assets/js/log-prepilot-v2.js');
  const header=source('assets/js/canonical-header.js');
  const game=source('log/index.html');
  const classic=source('log/DV00/index.html');
  const config=source('log/config.js');

  const operatorScript=/log-operator-support\.js/g;
  assert.strictEqual((game.match(operatorScript)||[]).length,1,'game console must load operator support exactly once');
  assert.strictEqual((classic.match(operatorScript)||[]).length,1,'classic console must load operator support exactly once');
  assert(game.includes('data-dv-operator-support="true"'),'game operator script must be explicitly marked');
  assert(classic.includes('data-dv-operator-support="true"'),'classic operator script must be explicitly marked');
  assert(!config.includes('log-operator-support.js'),'config must not dynamically inject operator support');
  assert(!header.includes('log-operator-support.js'),'canonical header must not dynamically inject operator support');
  assert(header.includes("addEventListener('dv:dashboard-rendered'"),'log header should consume dashboard render state');
  assert(header.includes('applyDashboardModel'),'log header must reuse the dashboard model instead of refetching it');
  assert(!header.includes("dv:dashboard-rendered',()=>hydrate"),'driver render must not trigger header dashboard hydration');

  assert(operator.includes('operator-support-host'),'operator support must use the stable operator host');
  assert(!operator.includes("name==='drive-ops'&&body.action==='edit_drive'"),'operator support must not monkey-patch drive edits');
  assert(driveRpc.includes('drive-admin-reason'),'admin drive edit must expose a visible reason field');
  assert(driveRpc.includes("wrap.style.display=active?'grid':'none'"),'admin reason field must be forcibly hidden for non-operator edits');
  assert(driveRpc.includes('Administrator edit reason is required.'),'admin drive edit must validate the reason locally');
  assert(driveRpc.includes("...(reason?{reason}:{})"),'admin drive edit must send the reason explicitly');
  assert(driveRpc.includes('Modify ${driver?.display_name'),'admin drive edit must still require confirmation');
  assert(operator.includes('Recompute progress'),'operator repair control must remain available');
  assert(operator.includes('app.selectDriver'),'operator search must select through the dashboard API');
  assert(!operator.includes('operatorBubble'),'operator support must not locate its host by page-wide text search');
  assert(!operator.includes('select.innerHTML=matches'),'operator search must not rebuild the driver selector');

  assert(!avatar.includes('sortDriverOptions'),'presentation code must not reorder the driver selector');
  assert(avatar.includes('const readOnly=isOperator'),'missing operator access metadata must fail closed to read-only');
  assert(avatar.includes("addEventListener('dv:drive-edit-mode'"),'read-only controls must react to bounded admin edit mode');
  assert(driveRpc.includes("addEventListener('dv:driver-changing'"),'drive edit state must clear when the driver changes');
  assert(driveRpc.includes("['drive-start','drive-end','drive-destination','drive-notes']"),'driver-specific draft values must clear on selection change');
  assert(driveRpc.includes("if(app.getDriverId()!==driverId)return;enterEdit"),'saved edit must not reopen after switching drivers during refresh');
  assert(detail.includes('detailToken'),'drive-detail responses must be tokenized against stale renders');
  assert(shared.includes("addEventListener('dv:driver-changing'"),'shared async work must invalidate on driver change');
  assert(!shared.includes("rpc('get_authenticated_driver_status_v1'"),'shared actions must reuse the dashboard status instead of duplicating it');
  assert(shared.includes('isReadOnly'),'late-created garage controls must enforce read-only access');
  assert(shared.includes("Garage changes are unavailable in read-only operator view."),'garage mutations need a read-only guard');
  assert(!shared.includes('cockpitStatus'),'shared actions must not duplicate license rendering');
  assert(!prepilot.includes('authNav('),'prepilot code must not own canonical account navigation');
  assert(!prepilot.includes('DRIVER_KEY'),'driver selection persistence must have one owner');
  assert(dashboard.includes('getRenderGeneration'),'dashboard must expose a render generation');
  assert(dashboard.includes('selectDriver'),'dashboard must expose the authoritative driver selection API');
  assert(dashboard.includes('Driver status timed out'),'driver status work must have a bounded timeout');
  assert(dashboard.includes('renderLicenseOnly'),'license status should update independently after an immediate driver render');
  assert(dashboard.includes('licenseStatusInFlight'),'selected-driver status calls must be deduplicated');
  assert(detail.includes('Administrator modification'));
  assert(detail.includes('Edit history'));
}

class ClassList{
  constructor(){this.values=new Set()}
  add(...xs){xs.forEach(x=>this.values.add(x))}
  remove(...xs){xs.forEach(x=>this.values.delete(x))}
  toggle(x,on){if(on===undefined)on=!this.values.has(x);if(on)this.values.add(x);else this.values.delete(x);return on}
  contains(x){return this.values.has(x)}
}
class El{
  constructor(id=''){this.id=id;this.dataset={};this.classList=new ClassList();this.listeners={};this.style={setProperty(){}};this.hidden=false;this.value='';this.textContent='';this.className='';this.options=[];this.children=[]}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
  dispatchEvent(event){event.target=this;for(const fn of this.listeners[event.type]||[])fn(event)}
  set innerHTML(value){this._innerHTML=String(value);if(this.id==='driver-select'){this.options=[...this._innerHTML.matchAll(/<option value="([^"]+)">([^<]*)<\/option>/g)].map(m=>({value:m[1],textContent:m[2]}))}}
  get innerHTML(){return this._innerHTML||''}
  querySelector(sel){if(sel==='button'){this._button??=new El();return this._button}return null}
  querySelectorAll(){return []}
  appendChild(el){this.children.push(el);el.parentElement=this;return el}
  setAttribute(name,value){this[name]=String(value)}
  removeAttribute(name){delete this[name]}
}
function customEvent(type,options={}){this.type=type;this.detail=options.detail}

async function lifecycleChecks(){
  const ids=[
    'app-login','app-main','login-form','login-email','login-status','sign-out','nav-log-drive','driver-select','driver-switcher',
    'driver-heading','kpi-hours','kpi-night','kpi-drives','kpi-xp','dash-xp','license-stage','license-date','age-gate','license-hours',
    'license-night-hours','hours-sign','dash-clock','vehicle-list','drive-list','quest-list','drive-vehicle','drive-date'
  ];
  const elements=new Map(ids.map(id=>[id,new El(id)]));
  const dash=new El('dashboard-console');
  const docListeners={};
  const document={
    documentElement:{dataset:{experience:'game'},toggleAttribute(){}},
    head:new El('head'),
    body:new El('body'),
    getElementById:id=>elements.get(id)||null,
    querySelector:sel=>sel==='.dashboard-console'?dash:null,
    querySelectorAll:()=>[],
    createElement:tag=>new El(tag),
    addEventListener(type,fn){(docListeners[type]??=[]).push(fn)}
  };
  const winListeners={};
  const rendered=[];
  const changing=[];
  const window={
    DV_APP_CONFIG:{supabaseUrl:'https://example.supabase.co',publishableKey:'pk'},
    location:{origin:'https://mydriveventure.com'},
    addEventListener(type,fn){(winListeners[type]??=[]).push(fn)},
    dispatchEvent(event){for(const fn of winListeners[event.type]||[])fn(event)},
  };
  window.addEventListener('dv:dashboard-rendered',e=>rendered.push(e.detail.driverId));
  window.addEventListener('dv:driver-changing',e=>changing.push(e.detail.driverId));

  const calls=[];
  let resolveSlow;
  const slowStatus=new Promise(resolve=>{resolveSlow=resolve});
  const statusPayload={ok:true,current_stage_display:'Level 1',stage_start_date:'2026-01-01',next_stage_display:'Level 2',requirements:[],days_until_age_eligible:10};
  const model={
    ok:true,is_operator:true,
    drivers:[
      {id:'manage',display_name:'Parker',license_stage:'L1'},
      {id:'view',display_name:'Clementine',license_stage:'L1'},
      {id:'slow',display_name:'Slow Driver',license_stage:'L1'}
    ],
    driver_access:[
      {driver_id:'manage',mode:'MANAGE'},
      {driver_id:'view',mode:'VIEW'},
      {driver_id:'slow',mode:'VIEW'}
    ],
    vehicles:[],
    progress:[
      {driver_id:'manage',total_minutes:60,night_minutes:0,total_drives:1,xp:10},
      {driver_id:'view',total_minutes:30,night_minutes:0,total_drives:1,xp:5},
      {driver_id:'slow',total_minutes:0,night_minutes:0,total_drives:0,xp:0}
    ],
    recent_drives:[],quest_awards:[],license_requirements:[]
  };
  const client={
    rpc(name,args){
      calls.push({name,args});
      if(name==='claim_authenticated_access_v1')return Promise.resolve({data:{ok:true},error:null});
      if(name==='get_authenticated_dashboard_v1')return Promise.resolve({data:JSON.parse(JSON.stringify(model)),error:null});
      if(name==='get_authenticated_driver_status_v1'){
        if(args?.p_driver_id==='slow')return slowStatus;
        return Promise.resolve({data:{...statusPayload},error:null});
      }
      throw new Error('Unexpected RPC '+name);
    },
    auth:{
      getSession:()=>Promise.resolve({data:{session:{user:{id:'u'}}}}),
      onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
      signInWithOtp:()=>Promise.resolve({error:null}),
      signOut:()=>Promise.resolve()
    }
  };
  window.supabase={createClient:()=>client};

  const localStore=new Map([['dv.log.driver','manage']]);
  const context={
    window,document,CustomEvent:customEvent,
    localStorage:{getItem:k=>localStore.get(k)||null,setItem:(k,v)=>localStore.set(k,String(v))},
    console,setTimeout,clearTimeout,Date,Math,Number,String,Array,Object,Map,Set,Promise
  };
  vm.runInNewContext(source('assets/js/log-dashboard-entry-v5.js'),context,{filename:'log-dashboard-entry-v5.js'});

  const waitFor=async(predicate,ms=500)=>{
    const start=Date.now();
    while(!predicate()){if(Date.now()-start>ms)throw new Error('Timed out waiting for dashboard test state');await new Promise(r=>setTimeout(r,5))}
  };
  await waitFor(()=>window.DV_LOG_APP?.getDriverId()==='manage'&&rendered.length===1);

  const app=window.DV_LOG_APP;
  assert.strictEqual(calls.filter(c=>c.name==='get_authenticated_dashboard_v1').length,1,'initial dashboard should load once');
  assert.deepStrictEqual(calls.filter(c=>c.name==='get_authenticated_driver_status_v1').map(c=>c.args.p_driver_id),['manage'],'initial load must fetch status only for the active driver');
  assert.strictEqual(app.getAccessMode('view'),'VIEW');
  assert.strictEqual(app.getAccessMode('missing'),'VIEW','operator access must fail closed to VIEW when metadata is missing');

  const initialGeneration=app.getRenderGeneration();
  await app.selectDriver('view');
  assert.strictEqual(app.getDriverId(),'view');
  assert(app.getRenderGeneration()>initialGeneration,'switch must advance generation');
  assert.strictEqual(calls.filter(c=>c.name==='get_authenticated_dashboard_v1').length,1,'driver switch must not refetch the dashboard');
  assert.deepStrictEqual(calls.filter(c=>c.name==='get_authenticated_driver_status_v1').map(c=>c.args.p_driver_id),['manage','view'],'status loading must be lazy per selected driver');

  for(let i=0;i<10;i++)await app.selectDriver(i%2===0?'manage':'view');
  assert.strictEqual(calls.filter(c=>c.name==='get_authenticated_dashboard_v1').length,1,'repeated switching must remain dashboard-fetch free');
  assert.strictEqual(calls.filter(c=>c.name==='get_authenticated_driver_status_v1').length,2,'cached driver status must prevent repeated status fan-out');
  assert.strictEqual(elements.get('driver-select').options.length,3,'switching must not rebuild a filtered driver selector');

  const renderedBeforeSlow=rendered.length;
  await app.selectDriver('slow');
  await app.selectDriver('manage');
  const renderedAfterManage=rendered.length;
  resolveSlow({data:{...statusPayload},error:null});
  await new Promise(r=>setTimeout(r,0));
  assert.strictEqual(app.getDriverId(),'manage','later selection must win over a slow earlier selection');
  assert.strictEqual(renderedAfterManage,renderedBeforeSlow+2,'both explicit selections should render immediately');
  assert.strictEqual(rendered.length,renderedAfterManage,'late slow status must not trigger an extra dashboard render');
  assert.strictEqual(rendered.at(-1),'manage','stale async work must not repaint the prior driver');
  assert.strictEqual(changing.at(-1),'manage');
}

(async()=>{
  syntaxChecks();
  architectureChecks();
  await lifecycleChecks();
  console.log('BKLG-0078 operator support and driver lifecycle regression tests passed');
})().catch(error=>{console.error(error);process.exitCode=1});
