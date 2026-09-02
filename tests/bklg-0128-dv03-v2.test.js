const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

function runtime(){
  const listeners={};
  const storage=new Map();
  const window={
    addEventListener:(name,fn)=>{listeners[name]=fn},
    dispatchEvent:()=>{}
  };
  const document={
    documentElement:{dataset:{dvRoute:'dv03v2'}},
    getElementById:()=>null,
    querySelector:()=>null,
    querySelectorAll:()=>[]
  };
  const context={
    window,document,
    sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
    CustomEvent:function(type,init){this.type=type;this.detail=init?.detail},
    Date,Map,Set,Object,Number,String,JSON
  };
  vm.runInNewContext(read('assets/js/log-game-dv03-v2.js'),context,{filename:'log-game-dv03-v2.js'});
  return{api:window.DV_GAME_DV03_V2,listeners};
}

test('DV03 v2 is an isolated authenticated copy with a collapsible non-windshield harness',()=>{
  const current=read('log/index.html');
  const html=read('log/DV03/v2/index.html');
  assert.match(html,/data-dv-route="dv03v2"/);
  assert.match(html,/id="app-login"/);
  assert.match(html,/id="app-main"/);
  assert.match(html,/id="dv03-harness-toggle"[^>]+aria-expanded="false"/);
  assert.match(html,/id="dv03-harness-panel"[^>]* hidden/);
  assert.ok(html.indexOf('id="dv03-scene-harness"')<html.indexOf('class="dashboard-console"'));
  assert.doesNotMatch(current,/log-game-dv03-v2|dv03-scene-harness|dv03-weather-layer/);
});

test('DV03 v2 preserves the approved sign/weather/cockpit/Hero stack',()=>{
  const html=read('log/DV03/v2/index.html');
  const order=['dv03-sign-layer','dv03-weather-layer','dv03-cockpit-frame-layer','dv03-hero-layer'];
  for(let i=1;i<order.length;i++)assert.ok(html.indexOf(order[i-1])<html.indexOf(order[i]));
  const css=read('assets/css/log-game-dv03-v2.css');
  assert.match(css,/\.dv03-sign-layer\{z-index:6\}\.dv03-weather-layer\{z-index:7/);
  assert.match(css,/\.dv03-cockpit-frame-layer\{z-index:8\}\.dv03-hero-layer\{z-index:9\}/);
});

test('all approved scene assets are selectable without award eligibility',()=>{
  const {api}=runtime();
  assert.equal(api.ASSETS.length,19);
  assert.deepEqual(Array.from(api.ASSETS,a=>a.id),['S1','S2','S3','S4','R1','R2','R3','R7','M2','L1','L2','L3','L4','L5','L6','L7','L8','L9','L10']);
  const selectable=new Set(api.ZONES.flatMap(zone=>zone.assets));
  for(const asset of api.ASSETS)assert.ok(selectable.has(asset.id),asset.id+' is missing from the harness');
});

test('current environment composes night plus snow independently of achievements',()=>{
  const {api,listeners}=runtime();
  listeners['dv:dashboard-rendered']({detail:{driverId:'driver-1',model:{quest_awards:[]},driver:{id:'driver-1'}}});
  listeners['dv:environment-night']({detail:{driverId:'driver-1',available:true,isNight:true}});
  listeners['dv:environment-weather']({detail:{driverId:'driver-1',available:true,summary:'Snow',road:'Snow / slush possible',skyMode:'snow',roadMode:'snow'}});
  const selection=api.autoSelection();
  assert.equal(selection.sky,'S1');
  assert.equal(selection.weather,'S3');
  assert.equal(selection.accent,'S4');
  assert.equal(selection.road,'R2');
  assert.equal(selection.destination,null);
});

test('achievement selection ranks tier, recency, rarity, XP, and restores both reset modes',()=>{
  const {api,listeners}=runtime();
  const now=new Date().toISOString();
  listeners['dv:dashboard-rendered']({detail:{driverId:'driver-1',driver:{id:'driver-1'},model:{quest_awards:[
    {driver_id:'driver-1',quest_key:'Q000035',awarded_at:now,xp_awarded:50,quest:{name:'Park',repeatable:true}},
    {driver_id:'driver-1',quest_key:'Q000012',awarded_at:now,xp_awarded:100,quest:{name:'Construction',repeatable:false}}
  ]}}});
  const auto=api.autoSelection();
  assert.equal(auto.destination,'L1');
  assert.equal(auto.roadwork,'R7');
  assert.equal(auto.billboard,null);
  api.resetBase();
  for(const zone of api.ZONES)assert.equal(api.resolvedSelection()[zone.key],null);
  api.resetDriver();
  assert.equal(api.resolvedSelection().destination,'L1');
  assert.equal(api.resolvedSelection().roadwork,'R7');
});

test('weather and night producers publish normalized current-condition events',()=>{
  const weather=read('assets/js/log-prepilot-v2.js');
  const night=read('assets/js/log-game-polish.js');
  assert.match(weather,/available:true,observedAt:/);
  assert.match(weather,/new CustomEvent\('dv:environment-weather'/);
  assert.match(night,/new CustomEvent\('dv:environment-night'/);
});
