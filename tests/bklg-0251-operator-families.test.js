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
