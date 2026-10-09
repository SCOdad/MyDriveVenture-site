const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');

test('BKLG-0251 adds protected Families / Activation operator surface',()=>{
  const html=read('operator/families/index.html');
  const js=read('operator/families/operator.js');
  const home=read('operator/index.html');
  assert.doesNotThrow(()=>new vm.Script(js));
  assert.match(html,/Families (?:&|&amp;) activation/);
  assert.match(js,/action:'family_roster'/);
  assert.match(js,/authorization:\`Bearer/);
  assert.match(home,/\/operator\/families\//);
});

test('activation funnel keeps engagement separate from commercial state',()=>{
  const html=read('operator/families/index.html');
  const js=read('operator/families/operator.js');
  for(const stage of ['REGISTERED','ONE_DRIVER','ONE_DRIVE','TWO_DRIVES','FIVE_DRIVES','MORE_THAN_5_DRIVES']) assert.ok(js.includes(stage),stage);
  assert.match(html,/Activation funnel/);
  assert.match(html,/Entitlement state/);
  assert.match(js,/commercial_state/);
});

test('family roster exposes people contacts and License Holder context',()=>{
  const js=read('operator/families/operator.js');
  assert.match(js,/License Holder/);
  assert.match(js,/person-contact/);
  assert.match(js,/e\.value\|\|e\.normalized_value/);
  assert.match(js,/has_auth_access/);
  assert.match(js,/driver_access/);
});

test('operator KPI cards link into family activation roster',()=>{
  const js=read('operator/dashboard.js');
  assert.match(js,/Active families'.*\/operator\/families\//s);
  assert.match(js,/Active drivers'.*stage=driver/s);
});


test('archived drivers are hidden by default and opt-in only',()=>{
  const html=read('operator/families/index.html');
  const js=read('operator/families/operator.js');
  assert.match(html,/id="include-archived-drivers" type="checkbox"/);
  assert.match(js,/includeArchived:false/);
  assert.match(js,/filter\.includeArchived\?\(f\.archived_drivers\|\|\[\]\):\[\]/);
  assert.match(js,/Archived<\/span>/);
  assert.match(js,/filter\.includeArchived\?\(f\.archived_drivers\|\|\[\]\)\.flatMap/);
});

test('archived drivers remain outside activation metrics',()=>{
  const js=read('operator/families/operator.js');
  assert.match(js,/Drivers<\/small><strong>\$\{num\(f\.driver_count\)\}/);
  assert.match(js,/Eligible drives<\/small><strong>\$\{num\(f\.eligible_drive_count\)\}/);
  assert.doesNotMatch(js,/driver_count\s*\+\s*.*archived/);
  assert.doesNotMatch(js,/eligible_drive_count\s*\+\s*.*archived/);
});


test('funnel click filters families currently at the exact stage',()=>{
  const html=read('operator/families/index.html');
  const js=read('operator/families/operator.js');
  assert.match(html,/Select a stage to show families currently at that stage/);
  assert.match(js,/data-stage=/);
  assert.match(js,/filter\.exact===b\.dataset\.stage\?'ALL':b\.dataset\.stage/);
  assert.doesNotMatch(js,/data-reached=/);
  assert.doesNotMatch(js,/filter\.reached/);
});

test('funnel shows cumulative reached count plus current-stage count',()=>{
  const js=read('operator/families/operator.js');
  assert.match(js,/exactCounts=Object\.fromEntries/);
  assert.match(js,/f\.status==='ACTIVE'&&f\.activation_stage===stage/);
  assert.match(js,/currently here/);
  assert.match(js,/\$\{num\(x\.count\)\}/);
});

test('redundant stalled-stage button row is removed and exact-stage dropdown remains',()=>{
  const html=read('operator/families/index.html');
  const js=read('operator/families/operator.js');
  assert.doesNotMatch(html,/stalled-filters|Stalled at:/);
  assert.match(html,/id="family-stage"/);
  assert.match(js,/document\.getElementById\('family-stage'\)\.value=filter\.exact/);
});


test('families page cache-busts operator assets after DOM contract changes',()=>{
  const html=read('operator/families/index.html');
  assert.match(html,/operator-dashboard\.css\?v=20261009-0251b/);
  assert.match(html,/operator\/config\.js\?v=20261009-0251b/);
  assert.match(html,/operator\/families\/operator\.js\?v=20261009-0251b/);
  assert.doesNotMatch(html,/operator\/families\/operator\.js\?v=20261007-0251/);
});

test('families bootstrap tolerates removed optional controls and fails visibly',()=>{
  const js=read('operator/families/operator.js');
  assert.match(js,/function bind\(id,event,handler\)\{const el=document\.getElementById\(id\);if\(!el\)return false;/);
  assert.match(js,/function showBootstrapFailure\(e\)/);
  assert.match(js,/The family roster could not initialize:/);
  assert.doesNotMatch(js,/document\.getElementById\('activation-funnel'\)\.addEventListener/);
  assert.doesNotMatch(js,/document\.getElementById\('stalled-filters'\)\.addEventListener/);
});
