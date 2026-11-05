const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const source=fs.readFileSync('assets/js/log-prepilot-v2.js','utf8');

function renderArchive({
  home_state='FL',license_stage='LEARNER',level1_license_date='2025-10-15',
  drive_date='2026-10-20',start_time='21:45:00',duration_minutes=31,
  florida_credit=null,overlap=null,awards=[]
}={}){
  const listeners={},driverId='fl-driver',list={innerHTML:'',after(){}};
  const document={
    head:{appendChild(){}},
    createElement(){return {textContent:''}},
    getElementById(id){return id==='drive-list'?list:null},
    querySelector(){return null},
    querySelectorAll(){return []},
    documentElement:{dataset:{experience:'game'}}
  };
  const window={
    DV_LOG_APP:{getDriverId:()=>driverId,client:{functions:{invoke:async()=>({data:{status:'LOCATION_PENDING'}})}}},
    addEventListener(name,handler){listeners[name]=handler}
  };
  new Function('window','document',source)(window,document);
  assert.equal(typeof listeners['dv:dashboard-rendered'],'function');
  const driver={id:driverId,home_state,license_stage,level1_license_date,timezone:'America/New_York'};
  const drive={id:'drive-1',driver_id:driverId,drive_date,start_time,
    duration_minutes,florida_credit,overlap,vehicle_name:'Orange Mobile',
    source:'WEB',destination:'Test #2 drive goes past 10pm'};
  listeners['dv:dashboard-rendered']({detail:{
    driverId,driver,progress:{},
    model:{recent_drives:[drive],quest_awards:awards,license_statuses:[]}
  }});
  return list.innerHTML;
}

test('BKLG-0278 actual dashboard archive renderer marks 16 restricted minutes after 10PM',()=>{
  const html=renderArchive();
  assert.match(html,/class="drive-item drive-item-fl-restricted"/);
  assert.match(html,/FLORIDA RESTRICTION · 16 MIN DO NOT COUNT/);
  assert.match(html,/16 min fall outside permitted Florida driving hours/);
  assert.match(html,/21:45–22:16/);
  assert.match(html,/data-drive-detail-id="drive-1"/);
});

test('BKLG-0278 authoritative Florida credit overrides learner clock fallback',()=>{
  const html=renderArchive({florida_credit:{license_stage:'LEARNER',prohibited_minutes:8}});
  assert.match(html,/FLORIDA RESTRICTION · 8 MIN DO NOT COUNT/);
  assert.doesNotMatch(html,/FLORIDA RESTRICTION · 16 MIN/);
  const intermediate=renderArchive({license_stage:'INTERMEDIATE',florida_credit:{license_stage:'INTERMEDIATE',prohibited_minutes:6}});
  assert.match(intermediate,/FLORIDA RESTRICTION · 6 MIN DO NOT COUNT/);
});

test('BKLG-0278 daytime and other jurisdictions remain unaffected',()=>{
  assert.doesNotMatch(renderArchive({start_time:'13:00:00',duration_minutes:30}),/FLORIDA RESTRICTION/);
  assert.doesNotMatch(renderArchive({home_state:'MI'}),/FLORIDA RESTRICTION/);
  assert.doesNotMatch(renderArchive({license_stage:'INTERMEDIATE'}),/FLORIDA RESTRICTION/);
  assert.doesNotMatch(renderArchive({start_time:'invalid'}),/FLORIDA RESTRICTION/);
  assert.doesNotMatch(renderArchive({duration_minutes:1500}),/FLORIDA RESTRICTION/);
});

test('BKLG-0278 archive retains pre-permit and overlapping warning semantics',()=>{
  const prepermit=renderArchive({drive_date:'2025-01-01'});
  assert.match(prepermit,/Before permit date · Does not count/);
  assert.match(prepermit,/drive-item-prepermit/);
  assert.doesNotMatch(prepermit,/FLORIDA RESTRICTION/);
  const overlap=renderArchive({overlap:{conflict_count:1}});
  assert.match(overlap,/drive-item-overlap/);
  assert.match(overlap,/FLORIDA RESTRICTION · 16 MIN DO NOT COUNT/);
  assert.match(overlap,/Potential time conflict/);
});

test('BKLG-0278 dashboard code and CSS reference the same actual archive elements',()=>{
  const css=fs.readFileSync('assets/css/log-dashboard-v3.css','utf8');
  const html=fs.readFileSync('log/index.html','utf8');
  assert.match(source,/document\.getElementById\('drive-list'\)/);
  assert.match(source,/drive-item-fl-restricted/);
  assert.match(css,/\.drive-item-fl-restricted\{/);
  assert.match(css,/\.drive-fl-restricted-eyebrow/);
  assert.match(html,/log-prepilot-v2\.js\?v=20261001-0235-weather-context1&bklg0278=fl-archive1/);
});
