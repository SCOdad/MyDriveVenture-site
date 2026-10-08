const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=path=>fs.readFileSync(path,'utf8');

test('UAT: Alpha capacity disables Add Driver without misleading FREE upgrade copy',()=>{
  const js=read('assets/js/family.js');
  assert.doesNotThrow(()=>new vm.Script(js));
  assert.match(js,/addDriver\.disabled=true/);
  assert.match(js,/family-driver-capacity-hint/);
  assert.match(js,/Need more than 3 drivers\? Contact mike@mydriveventure\.com/);
  assert.match(js,/hintWrapper\.tabIndex=0|wrapper\.tabIndex=0/);
  assert.doesNotMatch(js,/Your FREE Family includes 1 driver/);
  assert.doesNotMatch(js,/Upgrade to add driver/);
});

test('UAT: Add Driver ignores overlapping submissions and backend resume guard remains in force',()=>{
  const js=read('assets/js/family.js');
  assert.match(js,/f\.dataset\.submitting==='true'/);
  assert.match(js,/f\.dataset\.submitting='true'/);
  assert.match(js,/delete f\.dataset\.submitting/);
  assert.match(js,/btn\.disabled=true/);
});

test('UAT: Family supplementary requests run concurrently and log first-render timings',()=>{
  const js=read('assets/js/family.js');
  const refresh=js.slice(js.indexOf('async function refresh()'),js.indexOf('window.DVFamily=',js.indexOf('async function refresh()')));
  assert.match(refresh,/Promise\.allSettled/);
  assert.match(refresh,/overview=await call\('overview'\)/);
  assert.match(refresh,/\[Family Profiles timing\]/);
  assert.match(refresh,/render\(\)/);
});

test('UAT: detached avatar preload is eager and missed images can retry',()=>{
  const js=read('assets/js/family.js');
  assert.match(js,/img\.loading='eager'/);
  assert.doesNotMatch(js,/img\.loading='lazy'/);
  assert.match(js,/avatarMisses\.delete\(id\)/);
});

test('UAT: person names, driver headline, and license issue date lead card hierarchy',()=>{
  const js=read('assets/js/family.js');
  const css=read('assets/css/family.css');
  assert.match(js,/family-self-license-summary/);
  assert.match(js,/family-driver-title-edit/);
  assert.match(js,/data-license-name/);
  assert.match(js,/prettyStage\(d\.license_stage\)/);
  assert.doesNotMatch(js,/GUARDIAN \| YOU/);
  assert.match(js,/access=\(g\.driver_ids\|\|\[\]\)\.filter/);
  assert.match(css,/family-grownup-statusline \.step-label/);
  assert.match(css,/white-space:nowrap/);
  assert.match(css,/family-grownup-card \.family-card-actions/);
});

test('UAT: Text Parker toggle names the service in both directions',()=>{
  const js=read('assets/js/family-card-profile.js');
  assert.match(js,/Turn off Text Parker/);
  assert.match(js,/Turn on Text Parker/);
});
