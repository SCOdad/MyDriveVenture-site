const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');

test('Family is the canonical people and profile surface',()=>{
  const html=read('family/index.html');
  const profile=read('profile/index.html');
  const header=read('assets/js/canonical-header.js');
  assert.match(html,/Family &amp; Profiles/);
  assert.match(html,/id="family-profile-editor"/);
  assert.match(html,/id="profile-sms-state"/);
  assert.match(html,/id="profile-sms-action"/);
  assert.doesNotMatch(html,/<a href="\/profile\/"[^>]*>Profile/);
  assert.match(profile,/location\.replace/);
  assert.match(profile,/\/family\//);
  assert.doesNotMatch(header,/href=\"\/profile\/\"/);
  assert.match(header,/Family &amp; Profiles/);
  assert.match(header,/My Profile/);
});

test('Family cards select profiles while preserving explicit Driver Console access',()=>{
  const js=read('assets/js/family.js');
  assert.doesNotThrow(()=>new vm.Script(js));
  assert.match(js,/openProfile\(\{driver_id:card\.dataset\.driverId\}\)/);
  assert.match(js,/data-open-console/);
  assert.match(js,/openDriver\(consoleButton\.dataset\.openConsole\)/);
  assert.match(js,/family-grownup-self/);
  assert.match(js,/data-profile-person-id/);
});

test('grown-up profile edits suppress ZIP without suppressing driver profile controls',()=>{
  const js=read('assets/js/profile.js');
  const html=read('family/index.html');
  assert.doesNotThrow(()=>new vm.Script(js));
  assert.match(js,/zipWrap\)zipWrap\.hidden=!driver/);
  assert.match(js,/if\(s\.kind==='DRIVER'\)payload\.home_zip=zipInput\.value/);
  assert.match(html,/id="profile-zip-wrap"/);
  assert.match(html,/id="license-card"/);
  assert.match(html,/id="avatar-card"/);
});

test('Text Parker status and explicit consent actions are part of Contact Information',()=>{
  const js=read('assets/js/profile.js');
  for(const state of ['NO_MOBILE','VERIFICATION_PENDING','MOBILE_UNVERIFIED','VERIFIED_NOT_ENROLLED','OPTED_IN','OPTED_OUT']){
    assert.ok(js.includes(state),state+' should be represented');
  }
  assert.match(js,/action:'sms_consent_state'/);
  assert.match(js,/action:'set_sms_consent'/);
  assert.match(js,/Message frequency varies/);
  assert.match(js,/Reply HELP for help or STOP to opt out/);
});

test('driver account mode keeps the unified surface self-focused and skips Family data',()=>{
  const js=read('assets/js/profile.js');
  const family=read('assets/js/family.js');
  const css=read('assets/css/family.css');
  assert.match(js,/driverOnly=Boolean/);
  assert.match(js,/family-driver-profile-mode/);
  assert.match(family,/viewerProfileMode/);
  assert.match(family,/if\(mode\.driverOnly&&!hasInvite\)/);
  const initStart=family.indexOf('async function init');const initSource=family.slice(initStart,family.indexOf('bindPanelOpeners',initStart));
  assert.ok(initSource.indexOf('viewerProfileMode')<initSource.indexOf('await refresh()'),'driver role must be checked before Family overview');
  assert.match(css,/body\.family-driver-profile-mode \.family-hub-stack/);
  assert.match(css,/#grownup-panel/);
  assert.match(css,/#driver-panel/);
});

test('operator account navigation and operator tools remain available',()=>{
  const header=read('assets/js/canonical-header.js');
  assert.match(header,/role==='OPERATOR'/);
  assert.match(header,/Family &amp; Profiles/);
  for(const label of ['Operator Home','Operator Feedback','Backlog','Dictionary','Quests','Classification','Product Themes','Visual Assets','Nudges']){
    assert.ok(header.includes(label),label+' must remain in operator menu');
  }
});
