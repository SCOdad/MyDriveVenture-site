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
  assert.match(css,/body\.family-driver-profile-mode \.family-people-section/);
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

test('profile editor remains usable when contact-change status is unavailable',()=>{
  const js=read('assets/js/profile.js');
  assert.match(js,/Contact-change status unavailable; continuing with profile editing/);
  assert.match(js,/try\{const pending=await contactCall\(\{action:'pending_changes'\}\)/);
});

test('approved people-grid amendment uses landscape grown-ups and portrait drivers in one people section',()=>{
  const html=read('family/index.html'),css=read('assets/css/family.css');
  assert.match(html,/family-people-section/);
  assert.match(html,/family-grownup-grid/);
  assert.match(html,/family-driver-grid/);
  assert.match(css,/family-grownup-landscape/);
  assert.match(css,/--family-person-card-axis:340px/);
  assert.match(css,/family-grownup-landscape\{min-height:168px;width:min\(100%,var\(--family-person-card-axis\)\)/);
  assert.match(css,/family-driver-card\{min-height:var\(--family-person-card-axis\)/);
});
test('Add Grown-up and Add Driver share one action area',()=>{
  const html=read('family/index.html');
  const section=html.slice(html.indexOf('family-people-actions'),html.indexOf('family-grownups'));
  assert.match(section,/data-open-panel="grownup"/);
  assert.match(section,/data-open-panel="driver"/);
});
test('Text Parker is nested within Mobile and disabled when mobile is unavailable',()=>{
  const html=read('family/index.html'),js=read('assets/js/profile.js'),css=read('assets/css/family.css');
  assert.match(html,/id="mobile-contact-block"/);
  assert.match(html,/id="text-parker-mobile"/);
  assert.match(js,/Add and verify a mobile number to use Text Parker/);
  assert.match(js,/smsAction\.disabled=!actionable/);
  assert.match(js,/smsMobile\.classList\.toggle\('is-disabled',!actionable\)/);
  assert.match(css,/\.text-parker-mobile\.is-disabled/);
});

test('card-first profiles move editable identity and license summary into cards',()=>{
  const family=read('assets/js/family.js'),html=read('family/index.html'),card=read('assets/js/family-card-profile.js'),css=read('assets/css/family.css');
  assert.doesNotThrow(()=>new vm.Script(family));
  assert.doesNotThrow(()=>new vm.Script(card));
  for(const field of ['name','home_zip','email','mobile','license_effective_date']) assert.ok(family.includes('data-inline-edit="'+field+'"'),field);
  assert.match(family,/family-readonly-badge/);
  assert.match(family,/data-license-progress/);
  assert.match(card,/api\('profile-api','license_overview'/);
  assert.match(card,/api\('profile-api','update_license_effective_date'/);
  assert.match(card,/request_contact_change/);
  assert.match(card,/family-card-progress/);
  assert.match(html,/family-promoted-profile-form" hidden/);
  assert.match(css,/family-license-profile-card\.has-driver-accent/);
});
test('lower licensing section retains actions but removes duplicated progress display',()=>{
  const js=read('assets/js/profile.js'),html=read('family/index.html');
  assert.match(html,/Licensing actions/);
  assert.match(html,/Current stage, effective date, and progress now live on the driver card/);
  assert.match(js,/allReqs\.filter\(r=>!r\.met&&\/needs confirmation\/i/);
  assert.match(js,/No manual licensing confirmations are currently required/);
});
